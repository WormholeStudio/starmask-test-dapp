import { arrayify, hexlify } from '@ethersproject/bytes'
import {
  // encrypt,
  recoverPersonalSignature,
  // recoverTypedSignatureLegacy,
  // recoverTypedSignature,
  // recoverTypedSignature_v4 as recoverTypedSignatureV4,
} from 'eth-sig-util'
import BigNumber from 'bignumber.js'
import StarMaskOnboarding from '@starcoin/starmask-onboarding'
import { providers, utils, bcs } from '@starcoin/starcoin'

let starcoinProvider

const currentUrl = new URL(window.location.href)
const forwarderOrigin = currentUrl.hostname === 'localhost'
  ? 'http://localhost:9032'
  : undefined

const { isStarMaskInstalled } = StarMaskOnboarding

// Dapp Status Section
const networkDiv = document.getElementById('network')
const chainIdDiv = document.getElementById('chainId')
const accountsDiv = document.getElementById('accounts')

// Basic Actions Section
const onboardButton = document.getElementById('connectButton')
const getAccountsButton = document.getElementById('getAccounts')
const getAccountsResults = document.getElementById('getAccountsResult')

// Permissions Actions Section
const requestPermissionsButton = document.getElementById('requestPermissions')
const getPermissionsButton = document.getElementById('getPermissions')
const permissionsResult = document.getElementById('permissionsResult')

// Send STC Section
const sendButton = document.getElementById('sendButton')

// Ethereum Signature Section
// const ethSign = document.getElementById('ethSign')
// const ethSignResult = document.getElementById('ethSignResult')
const personalSign = document.getElementById('personalSign')
const personalSignResult = document.getElementById('personalSignResult')
const personalSignVerify = document.getElementById('personalSignVerify')
const personalSignVerifySigUtilResult = document.getElementById(
  'personalSignVerifySigUtilResult',
)
const personalSignVerifyECRecoverResult = document.getElementById(
  'personalSignVerifyECRecoverResult',
)
// const signTypedData = document.getElementById('signTypedData')
// const signTypedDataResult = document.getElementById('signTypedDataResult')
// const signTypedDataVerify = document.getElementById('signTypedDataVerify')
// const signTypedDataVerifyResult = document.getElementById(
//   'signTypedDataVerifyResult',
// )
// const signTypedDataV3 = document.getElementById('signTypedDataV3')
// const signTypedDataV3Result = document.getElementById('signTypedDataV3Result')
// const signTypedDataV3Verify = document.getElementById('signTypedDataV3Verify')
// const signTypedDataV3VerifyResult = document.getElementById(
//   'signTypedDataV3VerifyResult',
// )
// const signTypedDataV4 = document.getElementById('signTypedDataV4')
// const signTypedDataV4Result = document.getElementById('signTypedDataV4Result')
// const signTypedDataV4Verify = document.getElementById('signTypedDataV4Verify')
// const signTypedDataV4VerifyResult = document.getElementById(
//   'signTypedDataV4VerifyResult',
// )

// Contract Section
const callContractButton = document.getElementById('callContractButton')
const contractStatus = document.getElementById('contractStatus')

const initialize = async () => {
  console.log('initialize')
  try {
    // We must specify the network as 'any' for starcoin to allow network changes
    starcoinProvider = new providers.Web3Provider(window.starcoin, 'any')
  } catch (error) {
    console.error(error)
  }

  let onboarding
  try {
    onboarding = new StarMaskOnboarding({ forwarderOrigin })
  } catch (error) {
    console.error(error)
  }

  let accounts
  let accountButtonsInitialized = false

  const accountButtons = [
    getAccountsButton,
    requestPermissionsButton,
    getPermissionsButton,
    sendButton,
    callContractButton,
    // deployButton,
    sendButton,
    // createToken,
    personalSign,
    // signTypedData,
    // getEncryptionKeyButton,
    // ethSign,
    personalSign,
    // signTypedData,
    // signTypedDataV3,
    // signTypedDataV4,
  ]

  const isStarMaskConnected = () => accounts && accounts.length > 0

  const onClickInstall = () => {
    onboardButton.innerText = 'Onboarding in progress'
    onboardButton.disabled = true
    onboarding.startOnboarding()
  }

  const onClickConnect = async () => {
    try {
      const newAccounts = await window.starcoin.request({
        method: 'stc_requestAccounts',
      })
      handleNewAccounts(newAccounts)
    } catch (error) {
      console.error(error)
    }
  }

  const updateButtons = () => {
    const accountButtonsDisabled = !isStarMaskInstalled() || !isStarMaskConnected()
    if (accountButtonsDisabled) {
      for (const button of accountButtons) {
        button.disabled = true
      }
      // clearTextDisplays()
    } else {
      for (const button of accountButtons) {
        button.disabled = false
      }
    }

    if (!isStarMaskInstalled()) {
      onboardButton.innerText = 'Click here to install StarMask!'
      onboardButton.onclick = onClickInstall
      onboardButton.disabled = false
    } else if (isStarMaskConnected()) {
      onboardButton.innerText = 'Connected'
      onboardButton.disabled = true
      if (onboarding) {
        onboarding.stopOnboarding()
      }
    } else {
      onboardButton.innerText = 'Connect'
      onboardButton.onclick = onClickConnect
      onboardButton.disabled = false
    }
  }

  const initializeAccountButtons = () => {

    if (accountButtonsInitialized) {
      return
    }
    accountButtonsInitialized = true

    getAccountsButton.onclick = async () => {
      try {
        const _accounts = await window.starcoin.request({
          method: 'stc_accounts',
        })
        getAccountsResults.innerHTML = _accounts[0] || 'Not able to get accounts'
      } catch (err) {
        console.error(err)
        getAccountsResults.innerHTML = `Error: ${err.message}`
      }
    }

    /**
     * Permissions
     */

    requestPermissionsButton.onclick = async () => {
      try {
        permissionsResult.innerHTML = ''
        const permissionsArray = await window.starcoin.request({
          method: 'wallet_requestPermissions',
          params: [{ stc_accounts: {} }],
        })
        permissionsResult.innerHTML = getPermissionsDisplayString(permissionsArray)
      } catch (err) {
        console.error(err)
        permissionsResult.innerHTML = `Error: ${err.message}`
      }
    }

    getPermissionsButton.onclick = async () => {
      try {
        permissionsResult.innerHTML = ''
        const permissionsArray = await window.starcoin.request({
          method: 'wallet_getPermissions',
        })
        permissionsResult.innerHTML = getPermissionsDisplayString(permissionsArray)
      } catch (err) {
        console.error(err)
        permissionsResult.innerHTML = `Error: ${err.message}`
      }
    }

    /**
     * Sending STC
     */

    sendButton.onclick = async () => {
      console.log('sendButton.onclick')

      const toAccount = document.getElementById('toAccountInput').value
      if (!toAccount) {
        // eslint-disable-next-line no-alert
        window.alert('Invalid To: can not be empty!')
        return false
      }

      const sendAmount = parseFloat(document.getElementById('amountInput').value, 10)
      if (!(sendAmount > 0)) {
        // eslint-disable-next-line no-alert
        window.alert('Invalid sendAmount: should be a number!')
        return false
      }
      const BIG_NUMBER_NANO_STC_MULTIPLIER = new BigNumber('1000000000')
      const sendAmountSTC = new BigNumber(String(document.getElementById('amountInput').value), 10)
      const sendAmountNanoSTC = sendAmountSTC.times(BIG_NUMBER_NANO_STC_MULTIPLIER)
      const sendAmountHex = `0x${sendAmountNanoSTC.toString(16)}`
      console.log({ sendAmountHex, sendAmountNanoSTC: sendAmountNanoSTC.toString(10) })

      const transactionHash = await starcoinProvider.getSigner().sendUncheckedTransaction({
        to: toAccount,
        value: sendAmountHex,
        gasLimit: 127845,
        gasPrice: 1,
      })
      return console.log(transactionHash)
    }

    /**
     * Contract Interactions
     */

    callContractButton.onclick = async () => {
      contractStatus.innerHTML = 'Calling'
      callContractButton.disabled = true
      try {
        const functionId = '0x1::TransferScripts::peer_to_peer'
        const strTypeArgs = ['0x1::STC::STC']
        const tyArgs = utils.tx.encodeStructTypeTags(strTypeArgs)
        const toAccount = document.getElementById('toAccountInput').value
        if (!toAccount) {
          // eslint-disable-next-line no-alert
          window.alert('Invalid To: can not be empty!')
          return false
        }
        console.log({ toAccount })

        const sendAmount = parseFloat(document.getElementById('amountInput').value, 10)
        if (!(sendAmount > 0)) {
          // eslint-disable-next-line no-alert
          window.alert('Invalid sendAmount: should be a number!')
          return false
        }
        const BIG_NUMBER_NANO_STC_MULTIPLIER = new BigNumber('1000000000')
        const sendAmountSTC = new BigNumber(String(document.getElementById('amountInput').value), 10)
        const sendAmountNanoSTC = sendAmountSTC.times(BIG_NUMBER_NANO_STC_MULTIPLIER)
        const sendAmountHex = `0x${sendAmountNanoSTC.toString(16)}`

        // Multiple BcsSerializers should be used in different closures, otherwise, the latter will be contaminated by the former.
        const amountSCSHex = (function () {
          const se = new bcs.BcsSerializer()
          // eslint-disable-next-line no-undef
          se.serializeU128(BigInt(sendAmountNanoSTC.toString(10)))
          return hexlify(se.getBytes())
        })()
        console.log({ sendAmountHex, sendAmountNanoSTC: sendAmountNanoSTC.toString(10), amountSCSHex })

        const args = [
          arrayify(toAccount),
          Buffer.from('00', 'hex'),
          arrayify(amountSCSHex),
        ]

        const scriptFunction = utils.tx.encodeScriptFunction(functionId, tyArgs, args)
        console.log(scriptFunction)

        // Multiple BcsSerializers should be used in different closures, otherwise, the latter will be contaminated by the former.
        const payloadInHex = (function () {
          const se = new bcs.BcsSerializer()
          scriptFunction.serialize(se)
          return hexlify(se.getBytes())
        })()
        console.log({ payloadInHex })

        // const payloadInHex2 = '0x02000000000000000000000000000000010e44616f566f74655363726970747309636173745f766f74650207000000000000000000000000000000010353544303535443000700000000000000000000000000000001104f6e436861696e436f6e66696744616f134f6e436861696e436f6e666967557064617465010700000000000000000000000000000001185472616e73616374696f6e5075626c6973684f7074696f6e185472616e73616374696f6e5075626c6973684f7074696f6e000410b2aa52f94db4516c5beecef363af850a0801000000000000000101100050d6dc010000000000000000000000'
        // // const payloadInHex2 = payloadInHex
        // const bytes = arrayify(payloadInHex2)
        // const de = new bcs.BcsDeserializer(bytes)
        // const payload = starcoin_types.TransactionPayload.deserialize(de)
        // console.log({ payload })

        const senderAddressHex = '0x5a2cd40212ad13a1effab6b07cf31f06'
        const senderPublicKeyHex = '0xeb7cca2a26f952e9308796dff5c0b942d49a02ca09ef9f8975d5bf5f8e546da0'
        const senderSequenceNumber = await starcoinProvider.getSequenceNumber(senderAddressHex)
        // console.log({ senderSequenceNumber })

        // 0.01 STC
        const maxGasAmount = 10000000

        const receiverAddressHex = senderAddressHex
        const receiverAuthKeyHex = ''
        const sendAmountString = '1024u128'

        const txnRequest = {
          chain_id: 1,
          gas_unit_price: 1,
          sender: senderAddressHex,
          sender_public_key: senderPublicKeyHex,
          sequence_number: senderSequenceNumber,
          max_gas_amount: maxGasAmount,
          script: {
            code: functionId,
            strTypeArgs,
            args: [receiverAddressHex, `x"${receiverAuthKeyHex}"`, sendAmountString],
          },
        }
        // console.log({ txnRequest })
        const txnOutput = await starcoinProvider.dryRun(txnRequest)
        // console.log({ txnOutput })
        const gasUsed = txnOutput ? txnOutput.gas_used : 0
        // console.log({ gasUsed })
        const gasLimit = new BigNumber(gasUsed).times(new BigNumber(1.1)).toFixed(0)
        // console.log({ gasLimit })
        const transactionHash = await starcoinProvider.getSigner().sendUncheckedTransaction({
          data: payloadInHex,
          // ScriptFunction and Package need to estimateGas using dryRun first
          gasLimit,
          gasPrice: 1,
        })
        console.log({ transactionHash })

      } catch (error) {
        contractStatus.innerHTML = 'Call Failed'
        callContractButton.disabled = false
        throw error
      }
      contractStatus.innerHTML = 'Call Completed'
      callContractButton.disabled = false

      return null
    }
  }

  /**
   * Personal Sign
   */
  personalSign.onclick = async () => {
    const exampleMessage = 'Example `personal_sign` message'
    try {
      const from = accounts[0]
      const msg = `0x${Buffer.from(exampleMessage, 'utf8').toString('hex')}`
      const sign = await window.starcoin.request({
        method: 'personal_sign',
        params: [msg, from, 'Example password'],
      })
      personalSignResult.innerHTML = sign
      personalSignVerify.disabled = false
    } catch (err) {
      console.error(err)
      personalSign.innerHTML = `Error: ${err.message}`
    }
  }

  /**
   * Personal Sign Verify
   */
  personalSignVerify.onclick = async () => {
    const exampleMessage = 'Example `personal_sign` message'
    try {
      const from = accounts[0]
      const msg = `0x${Buffer.from(exampleMessage, 'utf8').toString('hex')}`
      const sign = personalSignResult.innerHTML
      const recoveredAddr = recoverPersonalSignature({
        data: msg,
        sig: sign,
      })
      if (recoveredAddr === from) {
        console.log(`SigUtil Successfully verified signer as ${recoveredAddr}`)
        personalSignVerifySigUtilResult.innerHTML = recoveredAddr
      } else {
        console.log(
          `SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`,
        )
        console.log(`Failed comparing ${recoveredAddr} to ${from}`)
      }
      const ecRecoverAddr = await window.starcoin.request({
        method: 'personal_ecRecover',
        params: [msg, sign],
      })
      if (ecRecoverAddr === from) {
        console.log(`Successfully ecRecovered signer as ${ecRecoverAddr}`)
        personalSignVerifyECRecoverResult.innerHTML = ecRecoverAddr
      } else {
        console.log(
          `Failed to verify signer when comparing ${ecRecoverAddr} to ${from}`,
        )
      }
    } catch (err) {
      console.error(err)
      personalSignVerifySigUtilResult.innerHTML = `Error: ${err.message}`
      personalSignVerifyECRecoverResult.innerHTML = `Error: ${err.message}`
    }
  }

  function handleNewAccounts (newAccounts) {
    accounts = newAccounts
    accountsDiv.innerHTML = accounts
    if (isStarMaskConnected()) {
      initializeAccountButtons()
    }
    updateButtons()
  }

  function handleNewChain (chainId) {
    chainIdDiv.innerHTML = chainId
  }

  function handleNewNetwork (networkId) {
    networkDiv.innerHTML = networkId
  }

  async function getNetworkAndChainId () {
    try {
      const chainInfo = await window.starcoin.request({
        method: 'chain.id',
      })
      handleNewChain(`0x${chainInfo.id.toString(16)}`)
      handleNewNetwork(chainInfo.id)
    } catch (err) {
      console.error(err)
    }
  }

  updateButtons()

  if (isStarMaskInstalled()) {

    window.starcoin.autoRefreshOnNetworkChange = false
    getNetworkAndChainId()

    try {
      const newAccounts = await window.starcoin.request({
        method: 'stc_accounts',
      })
      handleNewAccounts(newAccounts)
    } catch (err) {
      console.error('Error on init when getting accounts', err)
    }

    window.starcoin.on('chainChanged', handleNewChain)
    window.starcoin.on('networkChanged', handleNewNetwork)
    window.starcoin.on('accountsChanged', handleNewAccounts)
  }
}

window.addEventListener('DOMContentLoaded', initialize)

// utils

function getPermissionsDisplayString(permissionsArray) {
  if (permissionsArray.length === 0) {
    return 'No permissions found.'
  }
  const permissionNames = permissionsArray.map((perm) => perm.parentCapability)
  return permissionNames.reduce((acc, name) => `${acc}${name}, `, '').replace(/, $/u, '')
}
