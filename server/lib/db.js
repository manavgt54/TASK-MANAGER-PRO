// Simple in-memory database for deployment compatibility
let dbInstance = {
  users: [],
  tasks: [],
  password_resets: [],
  nextUserId: 1,
  nextTaskId: 1,
  nextResetId: 1
};

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
    } else if (sql.includes('SELECT * FROM tasks WHERE user_id = ?')) {
      const tasks = dbInstance.tasks.filter(t => t.user_id === params[0]);
      resolve(tasks);
    } else if (sql.includes('SELECT * FROM tasks WHERE id = ?')) {
      const task = dbInstance.tasks.find(t => t.id === params[0]);
      resolve(task || null);
    } else if (sql.includes('SELECT * FROM tasks WHERE id = ? AND user_id = ?')) {
      const task = dbInstance.tasks.find(t => t.id === params[0] && t.user_id === params[1]);
      resolve(task || null);
    } else if (sql.includes('SELECT * FROM password_resets')) {
      const reset = dbInstance.password_resets.find(r => 
        r.email === params[0] && r.otp === params[1] && r.used === 0 && new Date(r.expires_at) > new Date()
      );
      resolve(reset || null);
    } else {
      resolve(null);
    }
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve) => {
    if (sql.includes('SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC')) {
      const tasks = dbInstance.tasks.filter(t => t.user_id === params[0])
        .sort((a, b) => b.id - a.id);
      resolve(tasks);
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
        password_hash: params[1],
        created_at: new Date().toISOString()
      };
      dbInstance.users.push(user);
      resolve({ lastInsertRowid: user.id, changes: 1 });
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
      resolve({ lastInsertRowid: task.id, changes: 1 });
    } else if (sql.includes('INSERT INTO password_resets')) {
      const reset = {
        id: dbInstance.nextResetId++,
        email: params[0],
        otp: params[1],
        expires_at: params[2],
        used: 0,
        created_at: new Date().toISOString()
      };
      dbInstance.password_resets.push(reset);
      resolve({ lastInsertRowid: reset.id, changes: 1 });
    } else if (sql.includes('UPDATE users SET password_hash')) {
      const userIndex = dbInstance.users.findIndex(u => u.email === params[1]);
      if (userIndex !== -1) {
        dbInstance.users[userIndex].password_hash = params[0];
        resolve({ changes: 1 });
      } else {
        resolve({ changes: 0 });
      }
    } else if (sql.includes('UPDATE tasks SET')) {
      const taskIndex = dbInstance.tasks.findIndex(t => t.id === params[params.length - 2] && t.user_id === params[params.length - 1]);
      if (taskIndex !== -1) {
        const task = dbInstance.tasks[taskIndex];
        task.title = params[0] ?? task.title;
        task.description = params[1] ?? task.description;
        task.completed = params[2] !== undefined ? params[2] : task.completed;
        task.due_date = params[3] ?? task.due_date;
        task.list = params[4] ?? task.list;
        task.tags = params[5] ?? task.tags;
        task.subtasks = params[6] ?? task.subtasks;
        task.updated_at = new Date().toISOString();
        resolve({ changes: 1 });
      } else {
        resolve({ changes: 0 });
      }
    } else if (sql.includes('UPDATE tasks SET completed')) {
      const taskIndex = dbInstance.tasks.findIndex(t => t.id === params[1] && t.user_id === params[2]);
      if (taskIndex !== -1) {
        dbInstance.tasks[taskIndex].completed = params[0];
        dbInstance.tasks[taskIndex].updated_at = new Date().toISOString();
        resolve({ changes: 1 });
      } else {
        resolve({ changes: 0 });
      }
    } else if (sql.includes('UPDATE password_resets SET used = 1')) {
      const resetIndex = dbInstance.password_resets.findIndex(r => r.id === params[0] || r.email === params[0]);
      if (resetIndex !== -1) {
        dbInstance.password_resets[resetIndex].used = 1;
        resolve({ changes: 1 });
      } else {
        resolve({ changes: 0 });
      }
    } else if (sql.includes('DELETE FROM tasks')) {
      const taskIndex = dbInstance.tasks.findIndex(t => t.id === params[0] && t.user_id === params[1]);
      if (taskIndex !== -1) {
        dbInstance.tasks.splice(taskIndex, 1);
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


