#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const axios = require('axios');
const ora = require('ora');
const { table } = require('table');
const figlet = require('figlet');

const program = new Command();

// Configuration
const API_BASE = process.env.API_BASE || 'https://task-manager-pro-hqx6.onrender.com';
let authToken = null;
let userEmail = null;
let userData = null;

// Helper functions
const makeRequest = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'API Error');
    }
    throw new Error('Network Error');
  }
};

const login = async () => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Enter your email:',
      validate: (input) => input.includes('@') || 'Please enter a valid email',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter your password:',
      mask: '*',
    },
  ]);

  const spinner = ora('Logging in...').start();
  
  try {
    const response = await makeRequest('POST', '/api/auth/login', answers);
    
    if (response.success) {
      authToken = response.token;
      userEmail = response.user.email;
      userData = response.user;
      spinner.succeed(chalk.green('Login successful!'));
      console.log(chalk.blue(`Welcome, ${response.user.email}!`));
      return true;
    } else {
      spinner.fail(chalk.red('Login failed'));
      throw new Error(response.message);
    }
  } catch (error) {
    spinner.fail(chalk.red('Login failed'));
    throw error;
  }
};

const register = async () => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Enter your email:',
      validate: (input) => input.includes('@') || 'Please enter a valid email',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter your password:',
      mask: '*',
    },
  ]);

  const spinner = ora('Creating account...').start();
  
  try {
    const response = await makeRequest('POST', '/api/auth/register', answers);
    
    if (response.success) {
      authToken = response.token;
      userEmail = response.user.email;
      userData = response.user;
      spinner.succeed(chalk.green('Account created successfully!'));
      console.log(chalk.blue(`Welcome, ${response.user.email}!`));
      return true;
    } else {
      spinner.fail(chalk.red('Registration failed'));
      throw new Error(response.message);
    }
  } catch (error) {
    spinner.fail(chalk.red('Registration failed'));
    throw error;
  }
};

const getFullContext = async () => {
  if (!authToken) return null;

  try {
    // Get all user data
    const [tasksResponse, userResponse] = await Promise.all([
      makeRequest('GET', '/api/tasks'),
      makeRequest('GET', '/api/auth/me')
    ]);

    const context = {
      user: userResponse.success ? userResponse.user : userData,
      tasks: tasksResponse.success ? tasksResponse.tasks : [],
      // Add sticky notes if you have that endpoint
      // stickyNotes: stickyResponse.success ? stickyResponse.notes : [],
    };

    return context;
  } catch (error) {
    console.log(chalk.yellow('Warning: Could not fetch full context'));
    return null;
  }
};

const chatWithAI = async () => {
  if (!authToken) {
    console.log(chalk.red('Please login first using: task-chat login'));
    return;
  }

  console.log(chalk.blue.bold('🤖 AI Assistant with Full Context\n'));
  console.log(chalk.gray('I have access to all your tasks, progress, and data. Ask me anything!'));
  console.log(chalk.gray('Type "exit" to quit, "context" to see your data, "help" for commands\n'));

  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: chalk.cyan('You:'),
      },
    ]);

    if (message.toLowerCase() === 'exit') {
      console.log(chalk.yellow('Goodbye! 👋'));
      break;
    }

    if (message.toLowerCase() === 'context') {
      await showContext();
      continue;
    }

    if (message.toLowerCase() === 'help') {
      showHelp();
      continue;
    }

    const spinner = ora('AI is analyzing your data...').start();
    
    try {
      // Get full context
      const context = await getFullContext();
      
      if (!context) {
        spinner.fail(chalk.red('Could not fetch context'));
        continue;
      }

      // Send to AI with full context
      const response = await makeRequest('POST', '/api/chatbot', {
        message,
        userTasks: context.tasks,
        userEmail: context.user.email,
        fullContext: context, // Send everything
        contextType: 'full' // Indicate this is full context
      });
      
      if (response.success) {
        spinner.succeed();
        console.log(chalk.green(`AI: ${response.response}\n`));
        
        // Show task stats if available
        if (response.taskStats) {
          console.log(chalk.gray(`📊 Your Stats: ${response.taskStats.completed}/${response.taskStats.total} tasks completed, ${response.taskStats.pending} pending\n`));
        }
      } else {
        spinner.fail(chalk.red('AI response failed'));
        throw new Error(response.message);
      }
    } catch (error) {
      spinner.fail(chalk.red('AI response failed'));
      console.log(chalk.red(`Error: ${error.message}\n`));
    }
  }
};

const showContext = async () => {
  const spinner = ora('Fetching your data...').start();
  
  try {
    const context = await getFullContext();
    
    if (!context) {
      spinner.fail(chalk.red('Could not fetch context'));
      return;
    }

    spinner.succeed(chalk.green('Data fetched successfully!\n'));

    // Show user info
    console.log(chalk.blue.bold('👤 User Information:'));
    console.log(chalk.white(`Email: ${context.user.email}`));
    console.log(chalk.white(`Member since: ${new Date(context.user.created_at).toLocaleDateString()}\n`));

    // Show task summary
    const tasks = context.tasks;
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.length - completed;
    const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && !t.completed).length;

    console.log(chalk.blue.bold('📋 Task Summary:'));
    console.log(chalk.white(`Total Tasks: ${tasks.length}`));
    console.log(chalk.green(`Completed: ${completed}`));
    console.log(chalk.yellow(`Pending: ${pending}`));
    console.log(chalk.red(`High Priority: ${highPriority}`));
    console.log(chalk.red(`Overdue: ${overdue}\n`));

    // Show recent tasks
    if (tasks.length > 0) {
      console.log(chalk.blue.bold('📝 Recent Tasks:'));
      const recentTasks = tasks.slice(-5);
      recentTasks.forEach(task => {
        const status = task.completed ? chalk.green('✓') : chalk.yellow('⏳');
        const priority = task.priority === 'high' ? chalk.red('🔴') : 
                        task.priority === 'medium' ? chalk.yellow('🟡') : 
                        chalk.green('🟢');
        console.log(chalk.white(`  ${status} ${priority} ${task.title} (${task.list || 'Personal'})`));
      });
      console.log('');
    }

  } catch (error) {
    spinner.fail(chalk.red('Could not fetch context'));
    console.log(chalk.red(`Error: ${error.message}`));
  }
};

const showHelp = () => {
  console.log(chalk.blue.bold('🤖 AI Assistant Commands:\n'));
  console.log(chalk.white('• Ask me about your tasks: "What tasks do I have?"'));
  console.log(chalk.white('• Get motivation: "Motivate me" or "I need encouragement"'));
  console.log(chalk.white('• Task planning: "Help me plan my day" or "What should I prioritize?"'));
  console.log(chalk.white('• Productivity tips: "How can I be more productive?"'));
  console.log(chalk.white('• Stress relief: "I feel overwhelmed" or "Help me manage stress"'));
  console.log(chalk.white('• Task analysis: "Analyze my task patterns" or "What are my habits?"'));
  console.log(chalk.white('• Goal setting: "Help me set goals" or "What should I focus on?"'));
  console.log(chalk.white('• Time management: "How should I schedule my time?"'));
  console.log(chalk.white('• Context: "context" - See your current data'));
  console.log(chalk.white('• Help: "help" - Show this help'));
  console.log(chalk.white('• Exit: "exit" - Quit the chat\n'));
};

const showWelcome = () => {
  console.log(chalk.blue.bold(figlet.textSync('Task Chat', { horizontalLayout: 'full' })));
  console.log(chalk.cyan.bold('🚀 Your AI Productivity Assistant with Full Context\n'));
  console.log(chalk.gray('I have access to all your tasks, progress, and data.'));
  console.log(chalk.gray('Ask me anything about your productivity, tasks, or goals!\n'));
};

// CLI Commands
program
  .name('task-chat')
  .description('AI Chat Interface for Task Manager Pro with Full Context')
  .version('1.0.0');

program
  .command('login')
  .description('Login to your account')
  .action(async () => {
    try {
      await login();
    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command('register')
  .description('Create a new account')
  .action(async () => {
    try {
      await register();
    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command('chat')
  .description('Start AI chat with full context')
  .action(async () => {
    try {
      await chatWithAI();
    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command('context')
  .description('Show your current data context')
  .action(async () => {
    try {
      await showContext();
    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
    }
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode')
  .action(async () => {
    showWelcome();
    
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Login', value: 'login' },
            { name: 'Register', value: 'register' },
            { name: 'Start AI Chat', value: 'chat' },
            { name: 'Show Context', value: 'context' },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);

      if (action === 'exit') {
        console.log(chalk.yellow('Goodbye! 👋'));
        break;
      }

      try {
        switch (action) {
          case 'login':
            await login();
            break;
          case 'register':
            await register();
            break;
          case 'chat':
            await chatWithAI();
            break;
          case 'context':
            await showContext();
            break;
        }
      } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
      }

      console.log(''); // Add spacing
    }
  });

// Default command - start interactive mode
program
  .action(async () => {
    showWelcome();
    
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Login', value: 'login' },
            { name: 'Register', value: 'register' },
            { name: 'Start AI Chat', value: 'chat' },
            { name: 'Show Context', value: 'context' },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);

      if (action === 'exit') {
        console.log(chalk.yellow('Goodbye! 👋'));
        break;
      }

      try {
        switch (action) {
          case 'login':
            await login();
            break;
          case 'register':
            await register();
            break;
          case 'chat':
            await chatWithAI();
            break;
          case 'context':
            await showContext();
            break;
        }
      } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
      }

      console.log(''); // Add spacing
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.log(chalk.red(`Unhandled error: ${error.message}`));
  process.exit(1);
});

program.parse();
