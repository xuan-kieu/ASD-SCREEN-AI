// Types dưới dạng JSDoc comments để IDE vẫn có autocomplete
/**
 * @typedef {'happy'|'sad'|'angry'|'neutral'|'positive'|'negative'|'focused'} Emotion
 */

/**
 * @typedef {Object} BehavioralFeature
 * @property {number} timestamp
 * @property {number} [gazeX]
 * @property {number} [gazeY]
 * @property {boolean} [isLookingAtTarget]
 * @property {number} [attentionLevel]
 * @property {number} [smileIntensity]
 * @property {string} [affect]
 * @property {string} [gameId]
 */

/**
 * @typedef {Object} SubGameProps
 * @property {React.MutableRefObject} latestAIResult
 * @property {function} onFeatureCapture
 * @property {number} timeElapsed
 * @property {number} [gameDuration]
 * @property {string} [childName]
 * @property {string} [assessmentId]
 */