const VALID_TRANSITIONS = {
    requested: ['accepted', 'rejected'],
    accepted: ['started'],
    started: ['completed'],
};
function isValidTransition(currentStatus, nextStatus) {
    return VALID_TRANSITIONS[currentStatus]?.includes(nextStatus);
}

module.exports = { isValidTransition};