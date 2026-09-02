const memberService = require('../services/memberService');

/**
 * @route   POST /api/members
 * @desc    Create a new studio member
 * @access  Private (STAFF only)
 */
const createMember = async (req, res, next) => {
  try {
    const newMember = await memberService.createMember(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        member: newMember
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members
 * @desc    Get list of studio members
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getAllMembers = async (req, res, next) => {
  try {
    const members = await memberService.getAllMembers(req.query);
    res.status(200).json({
      status: 'success',
      results: members.length,
      data: {
        members
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/members/:id
 * @desc    Get a single member by ID
 * @access  Private (STAFF and INSTRUCTOR)
 */
const getMemberById = async (req, res, next) => {
  try {
    const member = await memberService.getMemberById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        member
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/members/:id
 * @desc    Update a studio member
 * @access  Private (STAFF only)
 */
const updateMember = async (req, res, next) => {
  try {
    const updatedMember = await memberService.updateMember(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: {
        member: updatedMember
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember
};
