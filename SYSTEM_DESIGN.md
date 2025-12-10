# System Design Document: MediBook

## Executive Summary

MediBook is a production-grade doctor appointment booking system designed to handle high concurrency scenarios while preventing race conditions and overbooking. This document outlines the scalability strategy for supporting millions of users similar to platforms like BookMyShow or RedBus.

## 1. High-Level System Architecture

### Current Architecture (MVP)

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │  Web App   │  │ Mobile App │  │   Admin    │             │
│  │  (React)   │  │  (Future)  │  │  Portal    │             │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │
└────────┼───────────────┼───────────────┼────────────────────┘
         │               │               │
         └───────────────┴───────────────┘
                         │
         ┌───────────────▼────────────────┐
         │      Load Balancer (Nginx)     │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────┐
         │     Application Layer          │
         │  ┌──────────────────────────┐  │
         │  │   Express.js Servers     │  │
         │  │   (Stateless, Scalable)  │  │
         │  └────────┬─────────────────┘  │
         └───────────┼────────────────────┘
                     │
         ┌───────────▼────────────────┐
         │    Caching Layer (Redis)   │
         │  - Session Storage         │
         │  - Slot Availability Cache │
         │  - Rate Limiting           │
         └───────────┬────────────────┘
                     │
         ┌───────────▼────────────────┐
         │   Database Layer           │
         │  ┌──────────────────────┐  │
         │  │  PostgreSQL Primary  │  │
         │  │  (Write Operations)  │  │
         │  └──────────┬───────────┘  │
         │             │               │
         │  ┌──────────▼───────────┐  │
         │  │  Read Replicas (2+)  │  │
         │  │  (Read Operations)   │  │
         │  └──────────────────────┘  │
         └────────────────────────────┘
```

### Production Architecture (Scaled)

```
                    ┌─────────────────┐
                    │   CDN (Cloudflare)│
                    │   - Static Assets │
                    │   - DDoS Protection│
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │  API Gateway      │
                    │  - Rate Limiting  │
                    │  - Authentication │
                    │  - Request Routing│
                    └────────┬──────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼────────┐
    │  App Servers      │       │  Background Jobs  │
    │  (Auto-scaling)   │       │  - Slot Expiry    │
    │  - Min: 3 nodes   │       │  - Notifications  │
    │  - Max: 50 nodes  │       │  - Analytics      │
    └─────────┬─────────┘       └───────────────────┘
              │
    ┌─────────▼─────────┐
    │  Message Queue    │
    │  (RabbitMQ/SQS)   │
    │  - Booking Queue  │
    │  - Email Queue    │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────────────────────────┐
    │         Data Layer                    │
    │  ┌────────────┐    ┌──────────────┐  │
    │  │  Redis     │    │  PostgreSQL  │  │
    │  │  Cluster   │    │  Cluster     │  │
    │  │  (Cache)   │    │  (Primary +  │  │
    │  │            │    │   Replicas)  │  │
    │  └────────────┘    └──────────────┘  │
    └───────────────────────────────────────┘
```

## 2. Database Design & Scaling

### Schema Optimization

**Current Schema:**
```sql
-- Optimized with indexes for performance
CREATE INDEX idx_slots_doctor_time ON appointment_slots(doctor_id, slot_time);
CREATE INDEX idx_slots_booked ON appointment_slots(is_booked);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_slot ON bookings(slot_id);
```

### Scaling Strategies

#### 2.1 Vertical Scaling
- **Current**: Single PostgreSQL instance
- **Production**: 
  - Primary: 16 vCPU, 64GB RAM
  - Replicas: 8 vCPU, 32GB RAM each

#### 2.2 Horizontal Scaling (Sharding)

**Sharding Strategy: Geographic Sharding**

```
┌─────────────────────────────────────────────┐
│           Shard Router                      │
│  (Routes based on doctor location)          │
└──────┬──────────────┬──────────────┬────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼───────┐
│  Shard 1    │ │  Shard 2   │ │  Shard 3   │
│  (US East)  │ │ (US West)  │ │  (Europe)  │
│  Doctors    │ │  Doctors   │ │  Doctors   │
│  1-10000    │ │ 10001-20000│ │ 20001-30000│
└─────────────┘ └────────────┘ └────────────┘
```

**Sharding Key**: `doctor_id % num_shards`

**Benefits**:
- Distributes load across multiple databases
- Reduces contention on single database
- Enables geographic data locality

#### 2.3 Read Replicas

```
Primary (Write)
    │
    ├─── Replica 1 (Read) - User queries
    ├─── Replica 2 (Read) - Admin dashboard
    └─── Replica 3 (Read) - Analytics
```

**Read/Write Split**:
- Writes: Primary only
- Reads: Round-robin across replicas
- Replication lag: < 100ms

#### 2.4 Connection Pooling

```javascript
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000
});
```

## 3. Concurrency Control Mechanisms

### 3.1 Database-Level Locking

**Pessimistic Locking (SELECT FOR UPDATE)**
```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT * FROM appointment_slots 
WHERE id = $1 
FOR UPDATE;  -- Locks the row

-- Perform booking logic

COMMIT;
```

**Benefits**:
- Prevents concurrent access to same slot
- Guarantees data consistency
- Simple to implement

**Drawbacks**:
- Can cause lock contention under high load
- Potential for deadlocks

### 3.2 Optimistic Locking (Version Field)

```sql
UPDATE appointment_slots 
SET is_booked = TRUE, version = version + 1
WHERE id = $1 AND version = $2;

-- If affected rows = 0, version mismatch detected
```

**Benefits**:
- No locks held during transaction
- Better performance under low contention
- Detects concurrent modifications

### 3.3 Hybrid Approach (Current Implementation)

Combines both strategies:
1. Use SELECT FOR UPDATE to lock slot
2. Check version before update
3. Use SERIALIZABLE isolation level

**Result**: Maximum safety with acceptable performance

### 3.4 Alternative: Distributed Locks (Redis)

For multi-server deployments:

```javascript
const lock = await redisClient.set(
  `lock:slot:${slotId}`,
  'locked',
  'NX',  // Only set if not exists
  'EX',  // Expire after
  10     // 10 seconds
);

if (lock) {
  // Perform booking
  await redisClient.del(`lock:slot:${slotId}`);
}
```

## 4. Caching Strategy

### 4.1 Cache Layers

**L1: Application Cache (In-Memory)**
```javascript
const doctorCache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes
```

**L2: Redis Cache (Distributed)**
```javascript
// Cache available slots
await redis.setex(
  `slots:doctor:${doctorId}:${date}`,
  300,  // 5 minutes TTL
  JSON.stringify(slots)
);
```

### 4.2 Cache Invalidation

**Write-Through Strategy**:
```javascript
// On booking creation
await createBooking(data);
await redis.del(`slots:doctor:${doctorId}:*`);
```

**Cache Warming**:
```javascript
// Pre-populate cache for popular doctors
cron.schedule('0 * * * *', async () => {
  const popularDoctors = await getPopularDoctors();
  for (const doctor of popularDoctors) {
    await cacheAvailableSlots(doctor.id);
  }
});
```

### 4.3 What to Cache

| Data Type | TTL | Invalidation |
|-----------|-----|--------------|
| Doctor List | 1 hour | On doctor create/update |
| Available Slots | 5 minutes | On booking create/cancel |
| User Sessions | 7 days | On logout |
| Static Content | 24 hours | On deployment |

## 5. Message Queue Usage

### 5.1 Asynchronous Operations

**Booking Confirmation Flow**:
```
User Books Slot
    │
    ├─── Immediate: Create booking record
    │
    └─── Queue: 
         ├─── Send confirmation email
         ├─── Send SMS notification
         ├─── Update analytics
         └─── Trigger calendar sync
```

### 5.2 Queue Architecture

```javascript
// Producer (Booking Service)
await queue.publish('bookings', {
  type: 'BOOKING_CONFIRMED',
  bookingId: booking.id,
  patientEmail: booking.patient_email
});

// Consumer (Notification Service)
queue.subscribe('bookings', async (message) => {
  if (message.type === 'BOOKING_CONFIRMED') {
    await sendConfirmationEmail(message);
  }
});
```

### 5.3 Benefits

- **Decoupling**: Services don't depend on each other
- **Reliability**: Retry failed operations
- **Scalability**: Process messages in parallel
- **Performance**: Non-blocking operations

## 6. API Rate Limiting

### 6.1 Rate Limit Strategy

```javascript
const rateLimit = require('express-rate-limit');

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 requests per window
  message: 'Too many booking attempts'
});

app.post('/api/bookings', bookingLimiter, createBooking);
```

### 6.2 Tiered Limits

| User Type | Requests/15min | Burst Limit |
|-----------|----------------|-------------|
| Anonymous | 10 | 20 |
| Registered | 50 | 100 |
| Premium | 200 | 400 |
| Admin | Unlimited | - |

## 7. Monitoring & Observability

### 7.1 Metrics to Track

**Application Metrics**:
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)
- Booking success rate

**Database Metrics**:
- Connection pool usage
- Query execution time
- Lock wait time
- Replication lag

**Business Metrics**:
- Bookings per hour
- Cancellation rate
- Popular doctors/time slots
- Revenue (if applicable)

### 7.2 Alerting

```yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    action: Page on-call engineer
  
  - name: Database Connection Pool Full
    condition: pool_usage > 90%
    action: Auto-scale database
  
  - name: Booking Failure Spike
    condition: booking_failures > 100/min
    action: Trigger incident response
```

## 8. Security Considerations

### 8.1 Authentication & Authorization

- JWT tokens with short expiry (7 days)
- Refresh token rotation
- Role-based access control (RBAC)
- API key authentication for third-party integrations

### 8.2 Data Protection

- Passwords hashed with bcrypt (10 rounds)
- Sensitive data encrypted at rest
- TLS 1.3 for data in transit
- PII data anonymization for analytics

### 8.3 API Security

- CORS configuration
- Helmet.js for security headers
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection

## 9. Disaster Recovery

### 9.1 Backup Strategy

**Database Backups**:
- Full backup: Daily at 2 AM UTC
- Incremental backup: Every 6 hours
- Point-in-time recovery: 30 days retention
- Geographic replication: 3 regions

### 9.2 Failover Strategy

```
Primary Database Failure
    │
    ├─── Automatic failover to replica (< 30 seconds)
    ├─── Update DNS to point to new primary
    ├─── Alert operations team
    └─── Promote replica to primary
```

## 10. Cost Optimization

### 10.1 Infrastructure Costs (Estimated)

| Component | Monthly Cost |
|-----------|--------------|
| App Servers (3x) | $150 |
| Database (Primary + 2 Replicas) | $300 |
| Redis Cache | $50 |
| Load Balancer | $30 |
| CDN | $20 |
| **Total** | **$550/month** |

### 10.2 Scaling Costs

At 1M users:
- App Servers: $500 (10x instances)
- Database: $1000 (larger instances + more replicas)
- Cache: $200 (Redis cluster)
- **Total**: ~$2000/month

## 11. Future Enhancements

### Phase 2 (3-6 months)
- Real-time updates via WebSockets
- Email/SMS notifications
- Payment integration
- Calendar sync (Google Calendar, Outlook)
- Mobile apps (iOS, Android)

### Phase 3 (6-12 months)
- AI-powered slot recommendations
- Telemedicine integration
- Multi-language support
- Advanced analytics dashboard
- Third-party API for integrations

## 12. Conclusion

This system design provides a solid foundation for a production-grade appointment booking system. The architecture is:

- **Scalable**: Can handle millions of users with horizontal scaling
- **Reliable**: Multiple layers of redundancy and failover
- **Performant**: Caching and optimized database queries
- **Secure**: Industry-standard security practices
- **Maintainable**: Clean architecture and monitoring

The hybrid concurrency control approach ensures data consistency even under extreme load, making it suitable for high-traffic scenarios similar to BookMyShow or RedBus.

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Author**: Tathagat
