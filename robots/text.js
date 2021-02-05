const algorithmia = require('algorithmia')
const algorithmiaApiKey = require('../credentials/algorithmia.json').apiKey
const sentenceBoundaryDetection = require('sbd')

const watsonApiKey = require('../credentials/watson-nlu.json').apikey
const { IamAuthenticator } = require('ibm-watson/auth');
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');

const nlu = new NaturalLanguageUnderstandingV1({
    version: '2020-08-01',
    authenticator: new IamAuthenticator({
        apikey: watsonApiKey,
      }),
    url: 'https://gateway.watsonplatform.net/natural-language-understanding/api/'
})

nlu.analyze({
    text: `Hi i'm michael jackson`,
    features: {
        keywords: {}
    }
}, (error, response) => {
    if (error) {
        throw error
    }

    console.log(JSON.stringify(response, null, 4))
    process.exit(0)
})

async function robot(content) {
    await fetchContentFromWikipedia(content)
    sanitizedContent(content)
    breakContentIntoSentenses(content)

    async function fetchContentFromWikipedia(content) {
        const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey)
        const wikipediaAlgorithm = algorithmiaAuthenticated.algo('web/WikipediaParser/0.1.2?timeout=300')
        const wikipediaResponse = await wikipediaAlgorithm.pipe(content.searchTerm)
        const wikipediaContent = wikipediaResponse.get()
        
        content.sourceContentOriginal = wikipediaContent.content
    }

    function sanitizedContent(content) {
        const withoutBlankLinesAndMarkdown = removeBlankLinesAndMarkdown(content.sourceContentOriginal)
        const withoutDatesInParentheses = removedatesInParentheses(withoutBlankLinesAndMarkdown)
        
        content.sourceContentSanitized = withoutDatesInParentheses
        function removeBlankLinesAndMarkdown(text) {
            const allLines = text.split('\n')

            const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
                if (line.trim().length === 0 || line.trim().startsWith('=')) {
                    return false
                }
                return true
            })

            return withoutBlankLinesAndMarkdown.join(' ')
        }
    }

    function removedatesInParentheses(text) {
        return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g,' ')
    }

    function breakContentIntoSentenses(content) {
        content.sentences = []

        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized)
        sentences.forEach((sentence) => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        })
    }
}

module.exports = robot