# Setup Instructions for Team Members

## MongoDB Atlas Configuration

### For the Project Owner:

1. **Whitelist IP Addresses** (MongoDB Atlas Dashboard):
   - Go to MongoDB Atlas → Network Access
   - Click "Add IP Address"
   - Option A: Add each team member's IP address individually
   - Option B: Add `0.0.0.0/0` to allow all IPs (recommended for development only, NOT for production)

2. **Create Database Users** for each team member:
   - Go to MongoDB Atlas → Database Access
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a username and password for each team member
   - **Important**: Under "Database User Privileges", select "Built-in Role" → **"Read and write to any database"** or at minimum "readWrite" on the `jobpath` database
   - Click "Add User"

3. **Share credentials securely**:
   - Send each team member their username and password via secure channel (not GitHub!)

### For Team Members:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jobpath
   ```

2. **Set up Backend**:
   ```bash
   cd backend
   npm install
   ```

3. **Create your local `.env` file**:
   - Copy the `.env.example` file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and replace `<username>` and `<password>` with the credentials provided by the project owner
   - **NEVER commit the `.env` file to GitHub!**

4. **Set up Frontend**:
   ```bash
   cd ../frontend
   npm install
   ```

5. **Create frontend `.env` file**:
   - Copy the `.env.example` file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - If your backend runs on a different port or machine, update `VITE_API_URL` accordingly
   - For local development, the default `http://localhost:5000` should work

6. **Run the application**:
   - Backend: In the `backend` folder, run `npm run dev` or `npm start`
   - Frontend: In the `frontend` folder, run `npm run dev`

## Troubleshooting

### HTTP 403 Error:
- **MongoDB Access**: Check that your IP address is whitelisted in MongoDB Atlas
- **Credentials**: Verify your username and password in the backend `.env` file
- **Permissions**: Ensure your MongoDB user has "readWrite" permissions
- **CORS**: Make sure the backend is running and the frontend `.env` has the correct `VITE_API_URL`
- **Backend URL**: If running backend on a different machine, update `VITE_API_URL` in frontend `.env` to point to that machine's IP/hostname

### Connection Timeout:
- Check your internet connection
- Verify the MongoDB cluster is running in Atlas
- Check if the connection string is correct

### Other Issues:
- Make sure Node.js is installed (version 16 or higher recommended)
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
