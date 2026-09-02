const Class = require('../models/Class');

/**
 * Creates a new class template.
 */
const createClass = async (classData) => {
  const { title, description, discipline, defaultDuration, defaultCapacity } = classData;

  if (!title || !discipline || defaultDuration === undefined || defaultCapacity === undefined) {
    const error = new Error('Please provide title, discipline, defaultDuration, and defaultCapacity.');
    error.statusCode = 400;
    throw error;
  }

  const durationNum = Number(defaultDuration);
  const capacityNum = Number(defaultCapacity);

  if (isNaN(durationNum) || durationNum < 1) {
    const error = new Error('defaultDuration must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  if (isNaN(capacityNum) || capacityNum < 1) {
    const error = new Error('defaultCapacity must be a number greater than or equal to 1.');
    error.statusCode = 400;
    throw error;
  }

  const newClass = await Class.create({
    title: title.trim(),
    description: description ? description.trim() : '',
    discipline: discipline.trim(),
    defaultDuration: durationNum,
    defaultCapacity: capacityNum,
    isArchived: false
  });

  return newClass;
};

/**
 * Retrieves all classes with support for query parameters.
 * By default, archived classes are excluded unless includeArchived=true is specified.
 */
const getAllClasses = async (query = {}, userRole = null) => {
  const filter = {};

  if (query.includeArchived === 'true') {
    if (userRole !== 'STAFF') {
      const error = new Error('Access denied. Only STAFF users can request archived classes.');
      error.statusCode = 403;
      throw error;
    }
  } else {
    filter.isArchived = false;
  }

  if (query.discipline) {
    filter.discipline = new RegExp(`^${query.discipline.trim()}$`, 'i');
  }

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  const classes = await Class.find(filter).sort({ title: 1 });
  return classes;
};

/**
 * Retrieves a single class by ID.
 */
const getClassById = async (id) => {
  const targetClass = await Class.findById(id);
  if (!targetClass) {
    const error = new Error('Class not found.');
    error.statusCode = 404;
    throw error;
  }
  return targetClass;
};

/**
 * Updates an existing class by ID.
 */
const updateClass = async (id, updateData) => {
  const targetClass = await Class.findById(id);
  if (!targetClass) {
    const error = new Error('Class not found.');
    error.statusCode = 404;
    throw error;
  }

  const { title, description, discipline, defaultDuration, defaultCapacity } = updateData;

  if (title !== undefined) targetClass.title = title.trim();
  if (description !== undefined) targetClass.description = description.trim();
  if (discipline !== undefined) targetClass.discipline = discipline.trim();

  if (defaultDuration !== undefined) {
    const durationNum = Number(defaultDuration);
    if (isNaN(durationNum) || durationNum < 1) {
      const error = new Error('defaultDuration must be a number greater than or equal to 1.');
      error.statusCode = 400;
      throw error;
    }
    targetClass.defaultDuration = durationNum;
  }

  if (defaultCapacity !== undefined) {
    const capacityNum = Number(defaultCapacity);
    if (isNaN(capacityNum) || capacityNum < 1) {
      const error = new Error('defaultCapacity must be a number greater than or equal to 1.');
      error.statusCode = 400;
      throw error;
    }
    targetClass.defaultCapacity = capacityNum;
  }

  await targetClass.save();
  return targetClass;
};

/**
 * Soft-archives a class (isArchived: true). Does not delete sessions or bookings.
 */
const archiveClass = async (id) => {
  const targetClass = await Class.findById(id);
  if (!targetClass) {
    const error = new Error('Class not found.');
    error.statusCode = 404;
    throw error;
  }

  targetClass.isArchived = true;
  await targetClass.save();
  return targetClass;
};

/**
 * Restores an archived class (isArchived: false).
 */
const restoreClass = async (id) => {
  const targetClass = await Class.findById(id);
  if (!targetClass) {
    const error = new Error('Class not found.');
    error.statusCode = 404;
    throw error;
  }

  targetClass.isArchived = false;
  await targetClass.save();
  return targetClass;
};

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  archiveClass,
  restoreClass
};
