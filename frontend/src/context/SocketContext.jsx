import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:5000`;

    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('🔌 Socket.io connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    // Global fault alert listener
    newSocket.on('critical_fault_alert', (data) => {
      toast.error(`🚨 Critical fault at station! ${data.type}`, { duration: 6000 });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinStation = (stationId) => {
    if (socketRef.current) {
      socketRef.current.emit('join_station', stationId);
    }
  };

  const leaveStation = (stationId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_station', stationId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinStation, leaveStation }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};
