const mongoose = require('mongoose');
const Admin = require('./models/Admin'); // This path should be correct
require('dotenv').config();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const createAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      $or: [
        { username: 'admin' },
        { email: 'Mutiuridwan0@gmail.com' }
      ]
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create new admin user
    const admin = new Admin({
      username: 'admin',
      email: 'Mutiuridwan0@gmail.com',
      password: 'Depriceless12@', // This will be hashed by the pre-save hook
      role: 'super_admin',
      isActive: true,
      permissions: ['full_access']
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: Depriceless12@');
    console.log('Email: Mutiuridwan0@gmail.com');
    console.log('Role: super_admin');
    console.log('');
    console.log('🚨 IMPORTANT: Change the password after first login!');

    process.exit(0);

  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

// Run the script after connection is open
mongoose.connection.once('open', () => {
  createAdmin();
});