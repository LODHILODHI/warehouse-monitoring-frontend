# Main Dashboard - Backend API Requirements

## Current Status

### Currently Used API:
- **Endpoint:** `GET /api/dashboard/stats`
- **Returns:**
  ```json
  {
    "totalWarehouses": 0,
    "activeWarehouses": 0,
    "stockEntriesToday": 0,
    "stockEntriesThisMonth": 0,
    "totalCameras": 0,
    "onlineCameras": 0,
    "recentStockEntries": [...],
    "chartData": [...] // Optional
  }
  ```

### Issues:
1. ❌ **Trend percentages are hardcoded** (showing fake data like "+12.5%", "+18.1%")
2. ❌ **Chart data is calculated from recent entries** (not accurate for monthly trends)
3. ❌ **Missing important metrics** (total stock, low stock alerts, total inspectors)
4. ❌ **Dashboard looks empty** because values are 0 or chart is flat

---

## Required Backend Enhancements

### 1. Enhanced Dashboard Stats API

**Endpoint:** `GET /api/dashboard/stats`

**Required Response Format:**
```json
{
  "metrics": {
    "totalWarehouses": 10,
    "activeWarehouses": 8,
    "inactiveWarehouses": 2,
    "stockEntriesToday": 25,
    "stockEntriesThisWeek": 150,
    "stockEntriesThisMonth": 650,
    "totalCameras": 20,
    "onlineCameras": 18,
    "offlineCameras": 2,
    "totalInspectors": 15,
    "activeInspectors": 12,
    "totalStockItems": 5000,
    "lowStockItems": 25,
    "totalStockValue": 1250000.50
  },
  "trends": {
    "warehouses": {
      "current": 10,
      "previous": 8,
      "change": 25.0,
      "changeType": "increase"
    },
    "stockEntriesToday": {
      "current": 25,
      "previous": 18,
      "change": 38.9,
      "changeType": "increase"
    },
    "stockEntriesThisMonth": {
      "current": 650,
      "previous": 520,
      "change": 25.0,
      "changeType": "increase"
    },
    "activeWarehouses": {
      "current": 8,
      "previous": 7,
      "change": 14.3,
      "changeType": "increase"
    }
  },
  "chartData": [
    {
      "month": "Oct",
      "entries": 450,
      "in": 300,
      "out": 150
    },
    {
      "month": "Nov",
      "entries": 520,
      "in": 350,
      "out": 170
    },
    {
      "month": "Dec",
      "entries": 480,
      "in": 320,
      "out": 160
    },
    {
      "month": "Jan",
      "entries": 550,
      "in": 380,
      "out": 170
    },
    {
      "month": "Feb",
      "entries": 600,
      "in": 400,
      "out": 200
    },
    {
      "month": "Mar",
      "entries": 650,
      "in": 450,
      "out": 200
    }
  ],
  "recentStockEntries": [
    {
      "id": "uuid",
      "itemName": "Electronics - Laptops",
      "type": "IN",
      "quantity": 50,
      "warehouse": {
        "id": "uuid",
        "name": "Karachi Central Warehouse"
      },
      "inspector": {
        "id": "uuid",
        "name": "John Inspector",
        "email": "inspector@warehouse.com"
      },
      "createdAt": "2026-03-05T12:17:00.000Z"
    }
  ],
  "topWarehouses": [
    {
      "warehouseId": "uuid",
      "warehouseName": "Karachi Central Warehouse",
      "totalEntries": 250,
      "entriesThisMonth": 85,
      "totalStock": 1500
    },
    {
      "warehouseId": "uuid",
      "warehouseName": "Lahore North Warehouse",
      "totalEntries": 200,
      "entriesThisMonth": 70,
      "totalStock": 1200
    }
  ],
  "stockDistribution": {
    "totalIn": 5000,
    "totalOut": 3000,
    "netStock": 2000,
    "inPercentage": 62.5,
    "outPercentage": 37.5
  },
  "lowStockAlerts": [
    {
      "itemName": "Food - Wheat Flour",
      "warehouseName": "Karachi Central Warehouse",
      "netStock": -40,
      "alertLevel": "critical"
    },
    {
      "itemName": "Textiles - Silk Fabric",
      "warehouseName": "Lahore North Warehouse",
      "netStock": -68,
      "alertLevel": "critical"
    }
  ]
}
```

---

### 2. Additional Metrics Cards Needed

**Current Cards (4):**
1. Total Warehouses ✅
2. Active Warehouses ✅
3. Stock Entries Today ✅
4. Stock Entries This Month ✅

**Suggested Additional Cards:**
5. **Total Stock Items** - Total unique items across all warehouses
6. **Low Stock Alerts** - Count of items with negative or low stock
7. **Total Inspectors** - Count of active inspectors
8. **Online Cameras** - Count of online cameras (already have totalCameras)

---

### 3. Chart Data Requirements

#### 3.1 Monthly Stock Activity Chart (Area Chart)
**Currently Used:** ✅ Yes
- **Data Points:** Last 6 months
- **Fields Required:**
  - `month`: Month abbreviation (Oct, Nov, Dec, Jan, Feb, Mar)
  - `entries`: Total entries for that month
  - `in`: Total IN entries (optional but recommended)
  - `out`: Total OUT entries (optional but recommended)

**Calculation:**
- Group all stock entries by month
- Count total entries per month
- Separate IN and OUT entries
- Return last 6 months of data

**Response Format:**
```json
"chartData": [
  {
    "month": "Oct",
    "entries": 450,
    "in": 300,
    "out": 150
  },
  {
    "month": "Nov",
    "entries": 520,
    "in": 350,
    "out": 170
  }
  // ... last 6 months
]
```

#### 3.2 Stock Distribution Chart (Pie/Doughnut Chart) - RECOMMENDED
**Purpose:** Show IN vs OUT stock distribution
- **Data Required:**
  - Total IN quantity across all warehouses
  - Total OUT quantity across all warehouses
  - Percentage breakdown

**Response Format:**
```json
"stockDistribution": {
  "totalIn": 5000,
  "totalOut": 3000,
  "netStock": 2000,
  "inPercentage": 62.5,
  "outPercentage": 37.5
}
```

#### 3.3 Top Warehouses by Activity (Bar Chart) - RECOMMENDED
**Purpose:** Show most active warehouses
- **Data Required:**
  - Top 5-10 warehouses by entry count
  - Warehouse name
  - Total entries
  - Entries this month

**Response Format:**
```json
"topWarehouses": [
  {
    "warehouseId": "uuid",
    "warehouseName": "Karachi Central Warehouse",
    "totalEntries": 250,
    "entriesThisMonth": 85,
    "totalStock": 1500
  },
  {
    "warehouseId": "uuid",
    "warehouseName": "Lahore North Warehouse",
    "totalEntries": 200,
    "entriesThisMonth": 70,
    "totalStock": 1200
  }
  // ... top 5-10
]
```

#### 3.4 Weekly Activity Trend (Line Chart) - OPTIONAL
**Purpose:** Show weekly trends for better granularity
- **Data Points:** Last 8 weeks
- **Fields Required:**
  - `week`: Week label (e.g., "Week 1", "Week 2" or date range)
  - `entries`: Total entries for that week
  - `in`: Total IN entries
  - `out`: Total OUT entries

**Response Format:**
```json
"weeklyChartData": [
  {
    "week": "Week 1",
    "weekStart": "2026-01-01",
    "weekEnd": "2026-01-07",
    "entries": 120,
    "in": 80,
    "out": 40
  }
  // ... last 8 weeks
]
```

#### 3.5 Stock by Category (Bar Chart) - OPTIONAL
**Purpose:** Show stock distribution by item categories
- **Data Required:**
  - Group items by category (e.g., "Electronics", "Food", "Textiles")
  - Count total stock per category
  - Show top 10 categories

**Response Format:**
```json
"stockByCategory": [
  {
    "category": "Electronics",
    "totalStock": 1500,
    "itemCount": 25
  },
  {
    "category": "Food",
    "totalStock": 1200,
    "itemCount": 30
  }
  // ... top 10 categories
]
```

---

### 4. Trend Calculations

**For each metric, calculate:**
- **Current Period Value:** Current value (today, this month, etc.)
- **Previous Period Value:** Same period last time (yesterday, last month, etc.)
- **Change Percentage:** `((current - previous) / previous) * 100`
- **Change Type:** "increase" or "decrease"

**Examples:**
- **Stock Entries Today:**
  - Current: Today's entries count
  - Previous: Yesterday's entries count
  - Change: Percentage difference

- **Stock Entries This Month:**
  - Current: This month's entries count
  - Previous: Last month's entries count
  - Change: Percentage difference

- **Total Warehouses:**
  - Current: Current total warehouses
  - Previous: Total warehouses 30 days ago
  - Change: Percentage difference

---

### 5. Recent Stock Entries

**Current:** ✅ Already working
- Returns last 10-20 entries
- Includes: itemName, type, quantity, warehouse, inspector, createdAt

**Enhancement Needed:**
- Ensure warehouse and inspector objects are populated (not just IDs)
- Add pagination support (optional)

---

### 6. Top Warehouses Section (Optional but Recommended)

**New Section to Add:**
- List top 5 warehouses by activity
- Show: warehouse name, total entries, entries this month, total stock

---

### 7. Stock Distribution (Optional but Recommended)

**New Section to Add:**
- Total IN vs Total OUT
- Net Stock calculation
- Percentage breakdown

---

## Implementation Priority

### High Priority (Must Have):
1. ✅ **Real trend percentages** - Replace hardcoded values
2. ✅ **Accurate chart data** - Monthly breakdown with IN/OUT
3. ✅ **Complete metrics** - All current metrics should return real values

### Medium Priority (Should Have):
4. ⚠️ **Additional metrics** - Total stock items, low stock alerts
5. ⚠️ **Top warehouses** - Most active warehouses list

### Low Priority (Nice to Have):
6. 💡 **Stock distribution** - IN vs OUT breakdown
7. 💡 **Low stock alerts** - Critical items list

---

## Example API Response Structure

```typescript
interface DashboardStats {
  metrics: {
    totalWarehouses: number;
    activeWarehouses: number;
    inactiveWarehouses: number;
    stockEntriesToday: number;
    stockEntriesThisWeek: number;
    stockEntriesThisMonth: number;
    totalCameras: number;
    onlineCameras: number;
    offlineCameras: number;
    totalInspectors: number;
    activeInspectors: number;
    totalStockItems?: number;
    lowStockItems?: number;
  };
  trends: {
    [key: string]: {
      current: number;
      previous: number;
      change: number; // percentage
      changeType: "increase" | "decrease";
    };
  };
  chartData: Array<{
    month: string;
    entries: number;
    in: number;
    out: number;
  }>;
  recentStockEntries: Array<StockEntry>;
  topWarehouses?: Array<{
    warehouseId: string;
    warehouseName: string;
    totalEntries: number;
    entriesThisMonth: number;
    totalStock: number;
  }>;
  stockDistribution?: {
    totalIn: number;
    totalOut: number;
    netStock: number;
    inPercentage: number;
    outPercentage: number;
  };
  lowStockAlerts?: Array<{
    itemName: string;
    warehouseName: string;
    netStock: number;
    alertLevel: "critical" | "warning";
  }>;
}
```

---

## Testing Checklist

- [ ] All metrics return real values (not 0)
- [ ] Trend percentages are calculated correctly
- [ ] Chart data shows last 6 months accurately
- [ ] Recent entries are sorted by date (newest first)
- [ ] Warehouse and inspector objects are populated in recent entries
- [ ] API response time is acceptable (< 2 seconds)
- [ ] Handles empty data gracefully (no errors when no entries exist)

---

## Notes

- **Authentication:** All endpoints require JWT token
- **Role-Based Access:** 
  - Super Admin: Full access to all data
  - Permanent Secretary: Read-only access
  - Inspector: Only assigned warehouses data
- **Performance:** Consider caching for dashboard stats (update every 5-10 minutes)
- **Date Handling:** Use UTC for all date calculations
