// XのAPI認証情報
const X_INFO = {
}

// ChatGPT(OpenAI)のAPI認証情報
const GPT_INFO = {
}

function main() {
  // ツイートするテキストを作成
  // ChatGPTからレスポンスを返却させる
  const content = generatePostText()
  const post = {
    text: content ? `${content} #元気になる一言Bot` : ''
  }
  const service = getService()
  if (service.hasAccess()) {
    const response = UrlFetchApp.fetch(X_INFO.endpoint_url, {
      method: 'POST',
      contentType: 'application/json',
      headers: {
        Authorization: `Bearer ${service.getAccessToken()}`
      },
      muteHttpExceptions: true,
      payload: JSON.stringify(post)
    })
    const res = JSON.parse(response.getContentText())
    Logger.log(JSON.stringify(res, null, 2))
  } else {
    const authorizationUrl = service.getAuthorizationUrl()
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl)
  }
}

// ChatGPTからポストするテキストを受け取る
const generatePostText = () => {
  const MESSAGES = [
   {'role': 'user', 'content': '50文字以内で元気になる言葉をください。'} 
  ]
  const requestBody = {
    model: GPT_INFO.model_name,
    messages: MESSAGES,
    temperature: GPT_INFO.temperature,
    max_tokens: GPT_INFO.max_tokens
  }
  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GPT_INFO.api_key}`,
      'X-Slack-No-Retry': 1
    },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  }
  const res = UrlFetchApp.fetch(GPT_INFO.endpoint_url, requestOptions)
  const postTextJson = JSON.parse(res.getContentText())
  return postTextJson.choices[0].message.content
}

// Xの自動投稿関連
const getService = () => {
  pkceChallengeVerifier()
  const userProps = PropertiesService.getUserProperties()
  // const scriptProps = PropertiesService.getScriptProperties()
  return OAuth2.createService('Twitter')
    .setAuthorizationBaseUrl(X_INFO.base_url)
    .setTokenUrl(`${X_INFO.verify_url}${userProps.getProperty('code_verifier')}`)
    .setClientId(X_INFO.client_id).setClientSecret(X_INFO.client_secret)
    .setCallbackFunction('authCallback')
    .setPropertyStore(userProps)
    .setScope('users.read tweet.read tweet.write offline.access')
    .setParam('response_type', 'code')
    .setParam('code_challenge_method', 'S256')
    .setParam('code_challenge', userProps.getProperty('code_challenge'))
    .setTokenHeaders({
      'Authorization': `Basic ${Utilities.base64Encode(`${X_INFO.client_id}:${X_INFO.client_secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    })
}

const authCallback = (request) => {
  const service = getService()
  const authorized = service.handleCallback(request)
  if (authorized) {
    return HtmlService.createHtmlOutput('Success')
  } else {
    return HtmlService.createHtmlOutput('Failed')
  }
}

const pkceChallengeVerifier = () => {
  const userProps = PropertiesService.getUserProperties()
  if (!userProps.getProperty('code_verifier')) {
    let verifier = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
    for (let i = 0; i < 128; i++) {
      verifier += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    const sha256Hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, verifier)
    const challenge = Utilities.base64Encode(sha256Hash).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    userProps.setProperty('code_verifier', verifier)
    userProps.setProperty('code_challenge', challenge)
  }
}

const logRedirectUri = () => {
  const service = getService()
  Logger.log(service.getRedirectUri())
}