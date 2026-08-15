FROM node:18-alpine
WORKDIR /app

# Copy backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy the backend and frontend folders
COPY backend ./backend
COPY frontend ./frontend

# Start the Node server inside the backend folder
WORKDIR /app/backend
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server.js"]
