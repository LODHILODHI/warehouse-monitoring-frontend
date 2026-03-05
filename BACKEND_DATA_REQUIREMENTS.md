# Backend Data Requirements for Warehouse Dashboard Charts

## Required API Endpoints

### 1. Stock Entries Over Time (Line/Area Chart)
**Endpoint:** `GET /api/warehouses/:id/stock-trends?period=week|month|year`

**Response Format:**
```json
{
  "warehouse": {
    "id": "uuid",
    "name": "Warehouse Name"
  },
  "trends": [
    {
      "date": "2024-03-01",
      "in": 150,
      "out": 50,
      "net": 100
    },
    {
      "date": "2024-03-02",
      "in": 200,
      "out": 75,
      "net": 125
    }
  ],
  "period": "week"
}
```

### 2. Top Items by Quantity (Bar Chart)
**Endpoint:** `GET /api/warehouses/:id/top-items?limit=10`

**Response Format:**
```json
{
  "warehouse": {
    "id": "uuid",
    "name": "Warehouse Name"
  },
  "topItems": [
    {
      "itemName": "Product A",
      "totalIn": 5000,
      "totalOut": 3200,
      "netStock": 1800,
      "entryCount": 25
    },
    {
      "itemName": "Product B",
      "totalIn": 3000,
      "totalOut": 2900,
      "netStock": 100,
      "entryCount": 18
    }
  ]
}
```

### 3. Activity Timeline (Timeline Chart)
**Endpoint:** `GET /api/warehouses/:id/activity-timeline?days=7`

**Response Format:**
```json
{
  "warehouse": {
    "id": "uuid",
    "name": "Warehouse Name"
  },
  "timeline": [
    {
      "date": "2024-03-01",
      "entries": 15,
      "inspectors": 2,
      "cameras": 4
    },
    {
      "date": "2024-03-02",
      "entries": 20,
      "inspectors": 2,
      "cameras": 4
    }
  ]
}
```

### 4. Stock Movement Distribution (Pie/Doughnut Chart)
**Endpoint:** `GET /api/warehouses/:id/stock-distribution`

**Response Format:**
```json
{
  "warehouse": {
    "id": "uuid",
    "name": "Warehouse Name"
  },
  "distribution": [
    {
      "type": "IN",
      "count": 150,
      "percentage": 75
    },
    {
      "type": "OUT",
      "count": 50,
      "percentage": 25
    }
  ]
}
```

### 5. Weekly/Monthly Comparison (Comparison Chart)
**Endpoint:** `GET /api/warehouses/:id/comparison?period=week|month`

**Response Format:**
```json
{
  "warehouse": {
    "id": "uuid",
    "name": "Warehouse Name"
  },
  "current": {
    "period": "2024-03",
    "totalIn": 5000,
    "totalOut": 3200,
    "entries": 150
  },
  "previous": {
    "period": "2024-02",
    "totalIn": 4500,
    "totalOut": 3000,
    "entries": 120
  },
  "change": {
    "in": 11.1,
    "out": 6.7,
    "entries": 25.0
  }
}
```

## Optional but Recommended

### 6. Camera Status History
**Endpoint:** `GET /api/warehouses/:id/camera-status-history?days=7`

### 7. Inspector Activity
**Endpoint:** `GET /api/warehouses/:id/inspector-activity`

## Notes
- All endpoints should support the same authentication as existing endpoints
- Data should be filtered based on user role (Inspector sees only assigned warehouses)
- Consider caching for better performance
- Support date range filtering where applicable
