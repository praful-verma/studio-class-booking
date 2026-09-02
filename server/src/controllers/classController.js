const classService = require('../services/classService');

/**
 * @route   POST /api/classes
 * @desc    Create a new class definition
 * @access  Private (STAFF only)
 */
const createClass = async (req, res, next) => {
  try {
    const newClass = await classService.createClass(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        class: newClass
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/classes
 * @desc    Get list of classes (hides archived by default unless includeArchived=true)
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getAllClasses = async (req, res, next) => {
  try {
    const classes = await classService.getAllClasses(req.query, req.user ? req.user.role : null);
    res.status(200).json({
      status: 'success',
      results: classes.length,
      data: {
        classes
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/classes/:id
 * @desc    Get a single class by ID
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getClassById = async (req, res, next) => {
  try {
    const targetClass = await classService.getClassById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        class: targetClass
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/classes/:id
 * @desc    Update a class definition
 * @access  Private (STAFF only)
 */
const updateClass = async (req, res, next) => {
  try {
    const updatedClass = await classService.updateClass(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: {
        class: updatedClass
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/classes/:id/archive
 * @desc    Archive a class definition
 * @access  Private (STAFF only)
 */
const archiveClass = async (req, res, next) => {
  try {
    const archivedClass = await classService.archiveClass(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        class: archivedClass
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/classes/:id/restore
 * @desc    Restore an archived class definition
 * @access  Private (STAFF only)
 */
const restoreClass = async (req, res, next) => {
  try {
    const restoredClass = await classService.restoreClass(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        class: restoredClass
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  archiveClass,
  restoreClass
};
