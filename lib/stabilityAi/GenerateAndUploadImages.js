const fs = require('fs');
const { uuid } = require('uuidv4');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { generateAsync } = require('stability-client');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class to generate stable diffusion images and upload to s3.
 */
class GenerateAndUploadImages {
  /**
   * Constructor
   *
   * @param {object} params
   * @param {string} params.prompt
   * @param {string} params.artStyle
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.prompt = params.prompt;
    oThis.artStyle = params.artStyle;

    oThis.dataDir = `/tmp/${uuid()}`;
  }

  /**
   * Performer of class.
   *
   * @returns {Promise<[]|*[]>}
   */
  async perform() {
    const oThis = this;

    oThis._validateAndSanitize();

    const imageFilePaths = await oThis._fetchImages();

    if (!imageFilePaths.length) {
      return [];
    }

    const s3Locations = await oThis._uploadImagesToS3(imageFilePaths);

    console.log('s3Locations: ', s3Locations);

    await oThis._removeDirectory(oThis.dataDir);

    return s3Locations;
  }

  /**
   * Validate and sanitize parameters.
   *
   * @private
   */
  _validateAndSanitize() {
    const oThis = this;

    if (!oThis.prompt) {
      throw new Error('Prompt is empty');
    }

    oThis.prompt = oThis.prompt.replace('.', '');
    oThis.prompt = oThis.prompt.replaceAll('"', '');

    oThis.prompt = '"' + `${oThis.prompt}` + '"';
    oThis.prompt = oThis.artStyle ? `${oThis.prompt}, ${oThis.artStyle}` : oThis.prompt;
  }

  /**
   * Fetch Image from stability apis.
   *
   * @returns {Promise<[]>}
   * @private
   */
  async _fetchImages() {
    const oThis = this;

    let imageFIlePaths;
    try {
      imageFIlePaths = await oThis._stabilityApiCall();

      return imageFIlePaths;
    } catch (err) {
      console.log('--------------------- Stability API Error ----------------', err.toString('utf8'));

      const error = err.toString('utf8');
      if (error.includes('Invalid prompts detected')) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_s_gau_fi_1',
            api_error_identifier: 'invalid_prompts_detected',
            debug_options: {
              prompt: oThis.prompt
            }
          })
        );
      }

      throw new Error('Failed to generate image');
    }
  }

  /**
   * Method invoke stablility ai api call.
   *
   * @returns {Promise<[]>}
   * @private
   */
  async _stabilityApiCall() {
    const oThis = this;

    // Check if the directory exists
    if (!fs.existsSync(oThis.dataDir)) {
      // Create the directory
      fs.mkdirSync(oThis.dataDir);
      console.log(`Directory '${oThis.dataDir}' created successfully.`);
    } else {
      console.log(`Directory '${oThis.dataDir}' already exists.`);
    }

    const { res, images } = await generateAsync({
      prompt: oThis.prompt,
      apiKey: coreConstants.STABILITY_API_KEY,
      width: 512,
      height: 512,
      outDir: oThis.dataDir,
      samples: 2
    });

    console.log('res: ', res);
    console.log('images: ', images);

    const imageFilePaths = [];

    for (const image of images) {
      imageFilePaths.push(image.filePath);
    }

    return imageFilePaths;
  }

  /**
   * Upload generated images to s3.
   *
   * @param imageFilePaths
   *
   * @returns {Promise<[]>}
   * @private
   */
  async _uploadImagesToS3(imageFilePaths) {
    const oThis = this;
    const promiseArray = [];
    for (const imageFilePath of imageFilePaths) {
      const fileName = uuid();
      console.log('fileName: ', fileName);

      promiseArray.push(oThis._putObject(`stability/${fileName}.png`, imageFilePath));
    }

    const responses = await Promise.all(promiseArray);
    const s3Urls = [];
    for (const response of responses) {
      let url = response.url.split('.com');
      url = coreConstants.NA_CDN_URL + url[1];
      s3Urls.push(url);
    }

    return s3Urls;
  }

  /**
   * Put object to s3 bucket.
   *
   * @param S3FilePath
   * @param filePath
   * @returns {Promise<unknown>}
   * @private
   */
  async _putObject(S3FilePath, filePath) {
    const oThis = this;

    const s3Client = await oThis._getInstance();

    const params = {
      Bucket: coreConstants.S3_BUCKET,
      Key: S3FilePath,
      Body: fs.createReadStream(filePath),
      ACL: 'public-read',
      ContentType: 'image/png'
    };
    console.log('_putObject--->');

    try {
      const command = new PutObjectCommand(params);
      const response = await s3Client.send(command);
      console.log('Upload successful: ', response);

      const objectUrl = `https://${coreConstants.S3_BUCKET}.s3.amazonaws.com/${S3FilePath}`;
      return { url: objectUrl || '' };
    } catch (err) {
      console.log('s3 upload error:', err);
    }
  }

  /**
   * Remove temporary directory from machine.
   *
   * @param directory
   * @returns {Promise<void>}
   * @private
   */
  async _removeDirectory(directory) {
    fs.rmdir(directory, { recursive: true }, (err) => {
      if (err) {
        throw err;
      }
    });
  }

  /**
   * Get AWS SDK instance.
   *
   * @returns {Promise<S3>}
   */
  async _getInstance() {
    const s3Client = new S3Client({
      region: coreConstants.S3_REGION,
      credentials: {
        accessKeyId: coreConstants.S3_ACCESS_KEY_ID,
        secretAccessKey: coreConstants.S3_SECRET_ACCESS_KEY
      }
    });

    return s3Client;
  }
}

module.exports = GenerateAndUploadImages;
