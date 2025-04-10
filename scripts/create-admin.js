  // scripts/create-admin.js
  require('dotenv').config({ path: '.env.local' });
  const mongoose = require('mongoose');
  const bcrypt = require('bcrypt');

  // Default admin credentials (customize these)
  const DEFAULT_ADMIN = {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'AdminPassword123',
    role: 'admin'
  };

  async function createAdminUser() {
    try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');

      // Check if AdminUser model exists, otherwise create it
      let AdminUser;
      try {
        AdminUser = mongoose.model('AdminUser');
      } catch {
        // Define the schema for admin user
        const AdminUserSchema = new mongoose.Schema({
          name: String,
          email: {
            type: String,
            required: true,
            unique: true,
          },
          password: {
            type: String,
            required: true,
          },
          role: {
            type: String,
            enum: ['admin', 'manager', 'staff'],
            default: 'admin',
          },
          isActive: {
            type: Boolean,
            default: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        });
        
        AdminUser = mongoose.model('AdminUser', AdminUserSchema);
      }

      // Check if admin user already exists
      const existingAdmin = await AdminUser.findOne({ email: DEFAULT_ADMIN.email });
      
      if (existingAdmin) {
        console.log('Admin user already exists:', existingAdmin.email);
        await mongoose.disconnect();
        return;
      }

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, saltRounds);

      // Create the admin user
      const adminUser = new AdminUser({
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        password: hashedPassword,
        role: DEFAULT_ADMIN.role,
        isActive: true
      });

      await adminUser.save();
      console.log('Admin user created successfully:', adminUser.email);

      // Disconnect from MongoDB
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error creating admin user:', error);
      process.exit(1);
    }
  }

  // Execute the function
  createAdminUser();