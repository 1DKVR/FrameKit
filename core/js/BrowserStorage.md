# 📦 Documentation
The `BrowserStorage.js` module is the core data persistence engine of **FrameKit**. It unifies the use of [`localStorage`](https://developer.mozilla.org/docs/Web/API/Window/localStorage), [`sessionStorage`](https://developer.mozilla.org/docs/Web/API/Window/sessionStorage), and [`IndexedDB`](https://developer.mozilla.org/docs/Web/API/IndexedDB_API) under a consistent, typed, and secure API.

## 🚀 1. `LocalBS` & `SessionBS` (Web Storage)
These static classes manage simple data (strings, objects, arrays) with **Namespace** support and **TTL** (Time To Live).

### Initial Configuration
```Javascript
import { LocalBS } from './core/js/BrowserStorage.js';

// Optional: Change the global namespace (default: "1D_Fk")
LocalBS.init("MyApp", true); // true = migrates old data to the new prefix
```

### Main Methods
| Method | Description |
| - | - |
| `set(key, value, ttl)` | Stores data. `ttl` is optional (in ms). |
| `get(key, full)` | Retrieves data. If `full` is true, returns the object with metadata. |
| `remove(key)`| Removes a specific entry. |
| `clear()`| Wipes all data belonging to the current namespace only. |

### Usage Example
```Javascript
// Store a theme for 24 hours
LocalBS.set("theme", "dark", 24 * 60 * 60 * 1000);

// Get raw value
const theme = LocalBS.get("theme"); 

// Get with metadata (timestamp, expiration)
const meta = LocalBS.get("theme", true);
```

## 🧬 2. IndexedBS (Structured Storage)
`IndexedBS` is a Promise-based wrapper for [`IndexedDB`](https://developer.mozilla.org/docs/Web/API/IndexedDB_API). It is ideal for large datasets or complex data structures.

### Schema Definition
```Javascript
const stores = {
    users: {
        keyPath: "email",
        autoIncrement: false,
        indexes: [
            { name: "by_name", keyPath: "username", options: { unique: false } }
        ]
    }
};

const db = new IndexedBS("MainDatabase", stores, 1);
await db.open();
```

### CRUD Operations (`db.api.[storeName]`)
- `add(item)` : Strict insertion. Fails if the key already exists (`ConstraintError`).
- `put(item)` : Add or Update (Idempotent).
- `get(key)` : Retrieves an object by its primary key.
- `getKey(key)` : Retrieves the key for a specific record.
- `getAll()` : Retrieves all records from the store.
- `count()` : Returns the total number of records.
- `delete(key)` : Deletes an entry.
- `clear()` : Clears all records in the specific store.
- `filter(predicate)` : Filters data using a cursor and a custom function.
- `find(index, value)` : Fast search using a predefined index.

### Notification System (Observer)
Observe real-time changes on a specific store:
```Javascript
const unsubscribe = db.api.users.subscribe(({ action, payload }) => {
    console.log(`Action ${action} performed on users!`);
});

// To stop observing:
unsubscribe();
```

## 🛠️ Debug Mode
Enable debug mode to automatically log all transactions to your console.
```Javascript
db.debug = true;
```

## ⚠️ Error Handling
The module automatically handles critical errors:
- **QuotaExceededError** : Logged to the console if browser storage is full.
- **ConstraintError** : Rejected if you attempt an `.add()` on an existing key.
- **JSON Parsing** : If storage data is corrupted, `.get()` returns the raw string instead of crashing.

_Engineered by [1D](https://github.com/1Dkvr) — Part of FrameKit Project._
