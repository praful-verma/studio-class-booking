const Member = require('../models/Member');

/**
 * Creates a new studio member.
 */
const createMember = async (memberData) => {
  const { name, email, membershipExpiry } = memberData;

  if (!name || !email || !membershipExpiry) {
    const error = new Error('Please provide name, email, and membershipExpiry.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Validate membershipExpiry date format
  const expiryDate = new Date(membershipExpiry);
  if (isNaN(expiryDate.getTime())) {
    const error = new Error('membershipExpiry must be a valid date.');
    error.statusCode = 400;
    throw error;
  }

  // Prevent duplicate member emails
  const existingMember = await Member.findOne({ email: normalizedEmail });
  if (existingMember) {
    const error = new Error('A member with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  const newMember = await Member.create({
    name: name.trim(),
    email: normalizedEmail,
    membershipExpiry: expiryDate
  });

  return newMember;
};

/**
 * Retrieves all studio members with optional search filtering.
 */
const getAllMembers = async (query = {}) => {
  const filter = {};

  if (query.search) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  const members = await Member.find(filter).sort({ name: 1 });
  return members;
};

/**
 * Retrieves a single member by ID.
 */
const getMemberById = async (id) => {
  const member = await Member.findById(id);
  if (!member) {
    const error = new Error('Member not found.');
    error.statusCode = 404;
    throw error;
  }
  return member;
};

/**
 * Updates an existing studio member.
 */
const updateMember = async (id, updateData) => {
  const member = await Member.findById(id);
  if (!member) {
    const error = new Error('Member not found.');
    error.statusCode = 404;
    throw error;
  }

  const { name, email, membershipExpiry } = updateData;

  if (name !== undefined) {
    member.name = name.trim();
  }

  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== member.email) {
      const duplicate = await Member.findOne({ email: normalizedEmail });
      if (duplicate) {
        const error = new Error('A member with this email already exists.');
        error.statusCode = 400;
        throw error;
      }
      member.email = normalizedEmail;
    }
  }

  if (membershipExpiry !== undefined) {
    const expiryDate = new Date(membershipExpiry);
    if (isNaN(expiryDate.getTime())) {
      const error = new Error('membershipExpiry must be a valid date.');
      error.statusCode = 400;
      throw error;
    }
    member.membershipExpiry = expiryDate;
  }

  await member.save();
  return member;
};

module.exports = {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember
};
