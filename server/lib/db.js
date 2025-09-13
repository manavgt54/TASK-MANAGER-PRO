// File-based database for deployment compatibility
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Initialize database
let dbInstance = {
  users: [],
  tasks: [],
  password_resets: [],
  nextUserId: 1,
  nextTaskId: 1,
  nextResetId: 1
};

// Load database from file
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      dbInstance = { ...dbInstance, ...JSON.parse(data) };
    }
  } catch (error) {
    console.log('Creating new database file');
  }
}

// Save database to file
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbInstance, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Load database on startup
loadDatabase();

function getDb() {
  return dbInstance;
}

// Helper functions for database operations
function dbGet(sql, params = []) {
  return new Promise((resolve) => {
    if (sql.includes('SELECT * FROM users WHERE email = ?')) {
      const user = dbInstance.users.find(u => u.email === params[0]);
      resolve(user || null);
    } else if (sql.includes('SELECT * FROM users WHERE id = ?')) {
      const user = dbInstance.users.find(u => u.id === params[0]);
      resolve(user || null);
    } else if (sql.includes('SELECT * FROM tasks WHERE id = ?')) {
      const task = dbInstance.tasks.find(t => t.id === params[0]);
      resolve(task || null);
    } else if (sql.includes('SELECT * FROM tasks WHERE id = ? AND user_id = ?')) {
      const task = dbInstance.tasks.find(t => t.id === params[0] && t.user_id === params[1]);
      resolve(task || null);
    } else if (sql.includes('SELECT * FROM password_resets WHERE email = ?')) {
      const reset = dbInstance.password_resets.find(r => r.email === params[0]);
      resolve(reset || null);
    } else if (sql.includes('SELECT * FROM password_resets WHERE token = ?')) {
      const reset = dbInstance.password_resets.find(r => r.token === params[0]);
      resolve(reset || null);
    } else {
      resolve(null);
    }
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve) => {
    if (sql.includes('SELECT * FROM tasks WHERE user_id = ?')) {
      const userTasks = dbInstance.tasks.filter(t => t.user_id === params[0]);
      resolve(userTasks);
    } else if (sql.includes('SELECT * FROM tasks')) {
      resolve(dbInstance.tasks);
    } else if (sql.includes('SELECT * FROM users')) {
      resolve(dbInstance.users);
    } else {
      resolve([]);
    }
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve) => {
    if (sql.includes('INSERT INTO users')) {
      const user = {
        id: dbInstance.nextUserId++,
        email: params[0],
        password: params[1],
        created_at: new Date().toISOString()
      };
      dbInstance.users.push(user);
      saveDatabase();
      resolve({ lastInsertRowid: user.id });
    } else if (sql.includes('INSERT INTO tasks')) {
      const task = {
        id: dbInstance.nextTaskId++,
        user_id: params[0],
        title: params[1],
        description: params[2],
        completed: params[3],
        due_date: params[4],
        list: params[5],
        tags: params[6],
        subtasks: params[7],
        created_at: new Date().toISOString(),
        updated_at: null
      };
      dbInstance.tasks.push(task);
      saveDatabase();
      resolve({ lastInsertRowid: task.id });
    } else if (sql.includes('INSERT INTO password_resets')) {
      const reset = {
        id: dbInstance.nextResetId++,
        email: params[0],
        token: params[1],
        expires_at: params[2],
        created_at: new Date().toISOString()
      };
      dbInstance.password_resets.push(reset);
      saveDatabase();
      resolve({ lastInsertRowid: reset.id });
    } else if (sql.includes('UPDATE tasks SET')) {
      const taskId = params[params.length - 2]; // Second to last param is usually the ID
      const taskIndex = dbInstance.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        // Update task fields based on SQL
        if (sql.includes('title = ?')) {
          dbInstance.tasks[taskIndex].title = params[0];
        }
        if (sql.includes('description = ?')) {
          dbInstance.tasks[taskIndex].description = params[1];
        }
        if (sql.includes('completed = ?')) {
          dbInstance.tasks[taskIndex].completed = params[2];
        }
        if (sql.includes('due_date = ?')) {
          dbInstance.tasks[taskIndex].due_date = params[3];
        }
        if (sql.includes('list = ?')) {
          dbInstance.tasks[taskIndex].list = params[4];
        }
        if (sql.includes('tags = ?')) {
          dbInstance.tasks[taskIndex].tags = params[5];
        }
        if (sql.includes('subtasks = ?')) {
          dbInstance.tasks[taskIndex].subtasks = params[6];
        }
        if (sql.includes('updated_at = datetime')) {
          dbInstance.tasks[taskIndex].updated_at = new Date().toISOString();
        }
        saveDatabase();
      }
      resolve({ changes: 1 });
    } else if (sql.includes('DELETE FROM tasks')) {
      const taskId = params[0];
      const taskIndex = dbInstance.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        dbInstance.tasks.splice(taskIndex, 1);
        saveDatabase();
        resolve({ changes: 1 });
      } else {
        resolve({ changes: 0 });
      }
    } else if (sql.includes('DELETE FROM password_resets')) {
      const token = params[0];
      const resetIndex = dbInstance.password_resets.findIndex(r => r.token === token);
      if (resetIndex !== -1) {
        dbInstance.password_resets.splice(resetIndex, 1);
        saveDatabase();
        resolve({ changes: 1 });
      } else {
        resolve({ changes: 0 });
      }
    } else {
      resolve({ changes: 0 });
    }
  });
}

module.exports = { getDb, dbGet, dbAll, dbRun };