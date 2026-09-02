const Room = require('../models/Room');

/**
 * Creates a new studio room.
 */
const createRoom = async (roomData) => {
  const { name, capacity, location } = roomData;

  if (!name || capacity === undefined) {
    const error = new Error('Please provide room name and capacity.');
    error.statusCode = 400;
    throw error;
  }

  const capacityNum = Number(capacity);
  if (isNaN(capacityNum) || capacityNum < 1) {
    const error = new Error('Room capacity must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  const trimmedName = name.trim();
  const existingRoom = await Room.findOne({ name: new RegExp(`^${trimmedName}$`, 'i') });
  if (existingRoom) {
    const error = new Error('Room with this name already exists.');
    error.statusCode = 400;
    throw error;
  }

  const newRoom = await Room.create({
    name: trimmedName,
    capacity: capacityNum,
    location: location ? location.trim() : '',
    isArchived: false
  });

  return newRoom;
};

/**
 * Retrieves all studio rooms. Excludes archived rooms by default unless includeArchived=true (STAFF only).
 */
const getAllRooms = async (query = {}, userRole = null) => {
  const filter = {};

  if (query.includeArchived === 'true') {
    if (userRole !== 'STAFF') {
      const error = new Error('Access denied. Only STAFF users can request archived rooms.');
      error.statusCode = 403;
      throw error;
    }
  } else {
    filter.isArchived = false;
  }

  if (query.search) {
    filter.name = new RegExp(query.search.trim(), 'i');
  }

  const rooms = await Room.find(filter).sort({ name: 1 });
  return rooms;
};

/**
 * Retrieves a single room by ID.
 */
const getRoomById = async (id) => {
  const room = await Room.findById(id);
  if (!room) {
    const error = new Error('Room not found.');
    error.statusCode = 404;
    throw error;
  }
  return room;
};

/**
 * Updates an existing studio room.
 */
const updateRoom = async (id, updateData) => {
  const room = await Room.findById(id);
  if (!room) {
    const error = new Error('Room not found.');
    error.statusCode = 404;
    throw error;
  }

  const { name, capacity, location } = updateData;

  if (name !== undefined) {
    const trimmedName = name.trim();
    if (trimmedName.toLowerCase() !== room.name.toLowerCase()) {
      const duplicate = await Room.findOne({ name: new RegExp(`^${trimmedName}$`, 'i') });
      if (duplicate) {
        const error = new Error('Room with this name already exists.');
        error.statusCode = 400;
        throw error;
      }
      room.name = trimmedName;
    }
  }

  if (capacity !== undefined) {
    const capacityNum = Number(capacity);
    if (isNaN(capacityNum) || capacityNum < 1) {
      const error = new Error('Room capacity must be a number greater than or equal to 1.');
      error.statusCode = 400;
      throw error;
    }
    room.capacity = capacityNum;
  }

  if (location !== undefined) {
    room.location = location.trim();
  }

  await room.save();
  return room;
};

/**
 * Soft-archives a room (isArchived: true).
 */
const archiveRoom = async (id) => {
  const room = await Room.findById(id);
  if (!room) {
    const error = new Error('Room not found.');
    error.statusCode = 404;
    throw error;
  }

  room.isArchived = true;
  await room.save();
  return room;
};

/**
 * Restores an archived room (isArchived: false).
 */
const restoreRoom = async (id) => {
  const room = await Room.findById(id);
  if (!room) {
    const error = new Error('Room not found.');
    error.statusCode = 404;
    throw error;
  }

  room.isArchived = false;
  await room.save();
  return room;
};

module.exports = {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  archiveRoom,
  restoreRoom
};
