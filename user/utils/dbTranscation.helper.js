const mongoose = require('mongoose');
const executeWithTransaction = async (operations) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const result = await operations(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

module.exports = { executeWithTransaction };