const express = require('express'),
  cookieParser = require('cookie-parser');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cookieHelper = require(rootPrefix + '/lib/cookieHelper'),
  cookieConstants = require(rootPrefix + '/lib/globalConstant/cookie'),
  FormatterComposerFactory = require(rootPrefix + '/lib/formatter/composer/Factory'),
  FetchImageFromStabilityAIService = require(rootPrefix + '/services/FetchImageFromStabilityAI'),
  MintNFTService = require(rootPrefix + '/services/MintNFT'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer'),
  apiNameConstants = require(rootPrefix + '/lib/globalConstant/apiName'),
  routeHelper = require(rootPrefix + '/routes/helper'),
  responseConfig = require(rootPrefix + '/config/apiParams/response');

const router = express.Router();

const FormatterComposer = FormatterComposerFactory.getComposer();

// Node.js cookie parsing middleware.
router.use(cookieParser(coreConstants.WEB_COOKIE_SECRET));

/* GET image suggestions */
router.get('/image-suggestions', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  const apiName = apiNameConstants.getImageSuggestions;
  req.internalDecodedParams.apiName = apiName;

  const dataFormatterFunc = async function(serviceResponse) {
    const formatterParams = Object.assign({}, responseConfig[apiName], { serviceData: serviceResponse.data });
    const wrapperFormatterRsp = await new FormatterComposer(formatterParams).perform();
    serviceResponse.data = wrapperFormatterRsp.data;
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, '/app/services/GetImageSuggestions', 'r_a_i_1', null, dataFormatterFunc)
  );
});

router.post('/connect', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  const apiName = apiNameConstants.authenticateUser;
  req.internalDecodedParams.apiName = apiName;

  const dataFormatterFunc = async function(serviceResponse) {
    if (serviceResponse.data.userLoginCookieValue) {
      cookieHelper.setUserLoginCookie(req, res, {
        cookieValue: serviceResponse.data.userLoginCookieValue,
        cookieName: cookieConstants.userLoginCookieName,
        cookieExpiry: cookieConstants.userCookieExpiryTime
      });
    }

    const formatterParams = Object.assign({}, responseConfig[apiName], { serviceData: serviceResponse.data });
    formatterParams.entityKindToResponseKeyMap = Object.assign({}, formatterParams.entityKindToResponseKeyMap);
    const wrapperFormatterRsp = await new FormatterComposer(formatterParams).perform();

    serviceResponse.data = wrapperFormatterRsp.data;
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, '/app/services/auth/Authenticate', 'r_a_i_2', null, dataFormatterFunc)
  );
});

/* GET all nfts to vote. */
router.get('/nfts', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  const apiName = apiNameConstants.getNftsToVoteApiName;
  req.internalDecodedParams.apiName = apiName;

  const dataFormatterFunc = async function(serviceResponse) {
    const formatterParams = Object.assign({}, responseConfig[apiName], { serviceData: serviceResponse.data });
    formatterParams.entityKindToResponseKeyMap = Object.assign({}, formatterParams.entityKindToResponseKeyMap);
    const wrapperFormatterRsp = await new FormatterComposer(formatterParams).perform();

    serviceResponse.data = wrapperFormatterRsp.data;
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, '/app/services/vote/GetNFTsForVote', 'r_a_i_3', null, dataFormatterFunc)
  );
});

router.use(cookieHelper.validateUserLoginCookieRequired);

/* To store data on ipfs */
router.post('/store-on-ipfs', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  const apiName = apiNameConstants.storeOnIpfsApiName;
  req.internalDecodedParams.apiName = apiName;

  const dataFormatterFunc = async function(serviceResponse) {
    const formatterParams = Object.assign({}, responseConfig[apiName], { serviceData: serviceResponse.data });
    formatterParams.entityKindToResponseKeyMap = Object.assign({}, formatterParams.entityKindToResponseKeyMap);
    const wrapperFormatterRsp = await new FormatterComposer(formatterParams).perform();

    serviceResponse.data = wrapperFormatterRsp.data;
  };

  Promise.resolve(
    routeHelper.perform(req, res, next, '/app/services/StoreNFTDataInIPFS', 'r_a_i_4', null, dataFormatterFunc)
  );
});

router.post('/reaction', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.internalDecodedParams.apiName = apiNameConstants.addReactionToNFT;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/vote/Reaction', 'r_a_i_2', null));
});

router.post('/submit-to-vote', sanitizer.sanitizeDynamicUrlParams, function(req, res, next) {
  req.internalDecodedParams.apiName = apiNameConstants.submitToVote;
  // TODO: get the userId from cookie token after auth layer is implemented.
  req.internalDecodedParams.current_user_id = 100009;

  Promise.resolve(routeHelper.perform(req, res, next, '/app/services/generate/SubmitToVote', 'r_a_i_5', null));
});

router.post('/fetch-stable-diffusion-image', async function(req, res, next) {
  try {
    const prompt = req.body.prompt,
      artStyle = req.body.art_style;
    const response = await new FetchImageFromStabilityAIService({
      prompt: prompt,
      artStyle: artStyle
    }).perform();
    let status = true;
    if (!basicHelper.isEmptyObject(response.error)) {
      status = false;
    }

    return res.status(200).json({ success: status, data: response });
  } catch (err) {
    console.error('error ---------', err);

    return res.status(200).json({ success: false, err: { msg: 'something went wrong' } });
  }
});

router.post('/mint-nft', async function(req, res, next) {
  try {
    const receiverAddress = req.body.receiver_address,
      imageUrl = req.body.image_url,
      description = req.body.description;

    const response = await new MintNFTService({
      receiverAddress: receiverAddress,
      imageUrl: imageUrl,
      description: description
    }).perform();

    let status = true;
    if (response.error != null) {
      status = false;
    }

    return res.status(200).json({ success: status, data: response });
  } catch (error) {
    console.error('error ---------', error);

    return res.status(200).json({
      success: false,
      err: { msg: 'something went wrong', err_data: error }
    });
  }
});

module.exports = router;
