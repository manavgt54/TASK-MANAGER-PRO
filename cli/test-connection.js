const axios = require('axios');

const API_BASE = 'https://task-manager-pro-hqx6.onrender.com';

async function testConnection() {
  console.log('Testing connection to:', API_BASE);
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Test login endpoint
    console.log('\n2. Testing login endpoint...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'nirmal.gupta6542@gmail.com',
      password: 'test123'
    });
    console.log('✅ Login successful:', loginResponse.data);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
    }
  }
}

testConnection();
