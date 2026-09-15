const isDevelopment =
  import.meta.env.DEV || (typeof __DEV__ !== 'undefined' && __DEV__)

const PRODUCTION_APP_ID = 'ca-app-pub-5315265085607151~6909812211'

const PRODUCTION_REWARDED_AD_UNIT_ID = 'ca-app-pub-5315265085607151/5405158852'

const TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917'

export const ADMOB_APP_ID = PRODUCTION_APP_ID

export const REWARDED_AD_UNIT_ID = isDevelopment
  ? TEST_REWARDED_AD_UNIT_ID
  : PRODUCTION_REWARDED_AD_UNIT_ID
