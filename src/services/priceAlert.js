const alerts = new Map();

function setAlert(userId, targetPrice, direction) {
    alerts.set(userId, {
        targetPrice,
        direction, // 'above' or 'below'
        timestamp: Date.now()
    });
}

function checkAlerts(currentPrice) {
    alerts.forEach((alert, userId) => {
        if (alert.direction === 'above' && currentPrice >= alert.targetPrice) {
            notifyUser(userId, currentPrice);
            alerts.delete(userId);
        } else if (alert.direction === 'below' && currentPrice <= alert.targetPrice) {
            notifyUser(userId, currentPrice);
            alerts.delete(userId);
        }
    });
}

async function notifyUser(userId, currentPrice) {
    try {
        // Implement notification logic here
        console.log(`Alert triggered for user ${userId} at price ${currentPrice}`);
    } catch (error) {
        console.error('Error notifying user:', error);
    }
}

module.exports = {
    setAlert,
    checkAlerts
};