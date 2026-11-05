/**
 * MongoDB Change Streams → Socket.io Bridge
 *
 * This service watches the Station and ChargingSession collections for changes
 * and emits real-time events to connected Socket.io clients.
 *
 * Flow:
 *   1. MongoDB Change Stream detects an insert/update operation
 *   2. changeStreamService processes the event
 *   3. Socket.io emits to the appropriate room (stationId)
 *   4. Frontend listeners update the UI
 */

const Station = require('../models/Station');
const ChargingSession = require('../models/ChargingSession');
const Fault = require('../models/Fault');

let io;

const initChangeStreams = (socketIo) => {
  io = socketIo;

  /**
   * CHANGE STREAM 1: Watch Station collection for slot availability changes
   * Triggers when: availableSlots or status changes (from session start/end)
   */
  const stationPipeline = [
    {
      $match: {
        $or: [
          { operationType: 'update' },
          { operationType: 'replace' },
        ],
        $or: [
          { 'updateDescription.updatedFields.availableSlots': { $exists: true } },
          { 'updateDescription.updatedFields.status': { $exists: true } },
          { 'updateDescription.updatedFields.currentOccupancyRate': { $exists: true } },
        ],
      },
    },
  ];

  try {
    const stationChangeStream = Station.watch(stationPipeline, {
      fullDocument: 'updateLookup',
    });

    stationChangeStream.on('change', async (change) => {
      try {
        const stationId = change.documentKey._id.toString();
        const updatedFields = change.updateDescription?.updatedFields || {};

        const payload = {
          stationId,
          availableSlots: change.fullDocument?.availableSlots,
          totalSlots: change.fullDocument?.totalSlots,
          status: change.fullDocument?.status,
          currentOccupancyRate: change.fullDocument?.currentOccupancyRate,
          slots: change.fullDocument?.slots,
          updatedFields,
          timestamp: new Date().toISOString(),
        };

        console.log(`🔄 Station updated: ${stationId} | Slots: ${payload.availableSlots}`);

        // Emit to station-specific room
        io.to(`station:${stationId}`).emit('slot_updated', payload);

        // Also emit to global map listeners
        io.emit('map_update', {
          stationId,
          availableSlots: payload.availableSlots,
          currentOccupancyRate: payload.currentOccupancyRate,
        });
      } catch (err) {
        console.error('Change stream error (station):', err);
      }
    });

    stationChangeStream.on('error', (err) => {
      console.warn('Station change stream warning (replica set likely inactive):', err.message);
    });

    /**
     * CHANGE STREAM 2: Watch ChargingSession for active session tracking
     */
    const sessionPipeline = [
      {
        $match: {
          operationType: { $in: ['insert', 'update'] },
        },
      },
    ];

    const sessionChangeStream = ChargingSession.watch(sessionPipeline, {
      fullDocument: 'updateLookup',
    });

    sessionChangeStream.on('change', async (change) => {
      try {
        const session = change.fullDocument;
        if (!session) return;

        const stationId = session.stationId.toString();

        if (change.operationType === 'insert') {
          io.to(`station:${stationId}`).emit('session_started', {
            sessionId: session._id.toString(),
            stationId,
            chargerType: session.chargerType,
            timestamp: session.startTime,
          });
        } else if (change.operationType === 'update' && session.status === 'completed') {
          io.to(`station:${stationId}`).emit('session_ended', {
            sessionId: session._id.toString(),
            stationId,
            duration: session.duration,
            energyConsumed: session.energyConsumed,
            timestamp: session.endTime,
          });
        }
      } catch (err) {
        console.error('Change stream error (session):', err);
      }
    });
    
    sessionChangeStream.on('error', (err) => {
      console.warn('Session change stream warning:', err.message);
    });

    /**
     * CHANGE STREAM 3: Watch Fault collection for new fault alerts
     */
    const faultPipeline = [
      { $match: { operationType: 'insert' } },
    ];

    const faultChangeStream = Fault.watch(faultPipeline, {
      fullDocument: 'updateLookup',
    });

    faultChangeStream.on('change', async (change) => {
      try {
        const fault = change.fullDocument;
        if (!fault) return;

        const stationId = fault.stationId.toString();

        // Emit fault alert to all users watching this station
        io.to(`station:${stationId}`).emit('fault_alert', {
          faultId: fault._id.toString(),
          stationId,
          type: fault.type,
          severity: fault.severity,
          description: fault.description,
          timestamp: fault.createdAt,
        });

        // Critical faults → broadcast to all users nearby
        if (fault.severity === 'critical') {
          io.emit('critical_fault_alert', {
            stationId,
            type: fault.type,
            severity: fault.severity,
            timestamp: fault.createdAt,
          });
        }

        console.log(`⚠️ Fault reported at station ${stationId}: ${fault.type} (${fault.severity})`);
      } catch (err) {
        console.error('Change stream error (fault):', err);
      }
    });
    
    faultChangeStream.on('error', (err) => {
      console.warn('Fault change stream warning:', err.message);
    });

    console.log('✅ MongoDB Change Streams initialized');
  } catch (err) {
    console.warn('⚠️ Change streams unavailable. Local MongoDB may not be a replica set:', err.message);
  }

};

module.exports = { initChangeStreams };
