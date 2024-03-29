const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util');

let invertedStatuses;
let invertedCuratedStatuses;

/**
 * Class for lens post constants
 *
 * @class LensPostConstants
 */
class LensPostConstants {
  get activeStatus() {
    return 'ACTIVE';
  }

  get inactiveStatus() {
    return 'INACTIVE';
  }

  get statuses() {
    const oThis = this;

    return {
      '1': oThis.activeStatus,
      '2': oThis.inactiveStatus
    };
  }

  get invertedStatuses() {
    const oThis = this;

    invertedStatuses = invertedStatuses || util.invert(oThis.statuses);

    return invertedStatuses;
  }

  get curatedStatus() {
    return 'CURATED';
  }

  get notCuratedStatus() {
    return 'UNCURATED';
  }

  get curatedStatuses() {
    const oThis = this;

    return {
      '1': oThis.curatedStatus,
      '2': oThis.notCuratedStatus
    };
  }

  get invertedCuratedStatuses() {
    const oThis = this;

    invertedCuratedStatuses = invertedCuratedStatuses || util.invert(oThis.curatedStatuses);

    return invertedCuratedStatuses;
  }
}

module.exports = new LensPostConstants();
