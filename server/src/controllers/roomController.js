const roomService = require('../services/roomService');

/**
 * @route   POST /api/rooms
 * @desc    Create a new room
 * @access  Private (STAFF only)
 */
const createRoom = async (req, res, next) => {
  try {
    const newRoom = await roomService.createRoom(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        room: newRoom
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/rooms
 * @desc    Get list of rooms (excludes archived by default unless includeArchived=true)
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getAllRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.getAllRooms(req.query, req.user ? req.user.role : null);
    res.status(200).json({
      status: 'success',
      results: rooms.length,
      data: {
        rooms
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/rooms/:id
 * @desc    Get a single room by ID
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getRoomById = async (req, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        room
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/rooms/:id
 * @desc    Update a room definition
 * @access  Private (STAFF only)
 */
const updateRoom = async (req, res, next) => {
  try {
    const updatedRoom = await roomService.updateRoom(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: {
        room: updatedRoom
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/rooms/:id/archive
 * @desc    Archive a room
 * @access  Private (STAFF only)
 */
const archiveRoom = async (req, res, next) => {
  try {
    const archivedRoom = await roomService.archiveRoom(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        room: archivedRoom
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/rooms/:id/restore
 * @desc    Restore an archived room
 * @access  Private (STAFF only)
 */
const restoreRoom = async (req, res, next) => {
  try {
    const restoredRoom = await roomService.restoreRoom(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        room: restoredRoom
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  archiveRoom,
  restoreRoom
};
