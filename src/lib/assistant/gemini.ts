import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  getHouseholdAccounts,
  getHouseholdTransactions,
  getHouseholdBills,
  getHouseholdSavingsGoals
} from './tools'

const MODEL_NAME = 'gemini-3.1-flash-lite'

// System instructions to shape assistant behavior
const SYSTEM_INSTRUCTION = `You are the Canvora Assistant, a secure, intelligent, household personal finance adviser.
You assist the household with budget analytics, upcoming bills, savings goals, and cash flow projections.

Follow these rules:
1. Maintain strict household boundaries. Only answer using the data returned by the tools.
2. DO NOT assume details not present in the tool results.
3. Present structured, clear tables for cash, bills, and goals when helpful.
4. Format citations cleanly. When referencing an account, bill, or savings goal, link to the relevant section using browser paths:
   - Dashboard: [dashboard](/dashboard) or Specific Account: [Account Name](/dashboard)
   - Bill Calendar: [calendar](/calendar) or Specific Bill: [Bill Name](/calendar)
   - Savings Goals: [savings](/savings) or Specific Goal: [Goal Name](/savings)
5. NEVER fabricate account numbers, access credentials, or transaction details.
6. Keep answers helpful, concise, and focused on private family wealth.
`

const functionDeclarations = [
  {
    name: 'getHouseholdAccounts',
    description: 'Retrieves all financial account balances (depository checking/savings, credit limits, loans).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getHouseholdTransactions',
    description: 'Retrieves recent synced bank transactions for the household.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: {
          type: 'INTEGER',
          description: 'Maximum number of transactions to return. Default is 20.',
        },
        category: {
          type: 'STRING',
          description: 'Optional category name to filter by (e.g., Food, Utilities, Entertainment).',
        },
      },
    },
  },
  {
    name: 'getHouseholdBills',
    description: 'Retrieves upcoming bill occurrences due soon or overdue for the household.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'getHouseholdSavingsGoals',
    description: 'Retrieves the list of active savings goals with their target amounts and status.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
]

export async function askFinancialAssistant(
  householdId: string,
  userMessage: string,
  chatHistory: Array<{ role: 'user' | 'model'; parts: any[] }> = []
): Promise<{ answer: string; history: any[] }> {
  
  const apiKey = process.env.GEMINI_API_KEY
  const isMockMode = !apiKey || apiKey === 'your-gemini-api-key'

  if (isMockMode) {
    // Offline / Mock Assistant Response to allow easy local testing
    return {
      answer: `**[Offline Assistant Mode]** I am running in sandbox mode because the \`GEMINI_API_KEY\` is not configured.
      
Based on your sandboxed household database, I can see:
* Your liquid accounts are: **[Mock Checking Account](/dashboard)** ($4,520.50) and **[Mock Savings Account](/dashboard)** ($45,830.00).
* You have a **[Mock Credit Card](/dashboard)** liability of $1,240.80.
* Your upcoming bills due soon include **[Xfinity Comcast](/calendar)** ($84.99) due soon.
* Your current savings goal is **[Emergency Fund](/savings)** which is 92% complete.
      
Let me know if you'd like to simulate other queries!`,
      history: [
        ...chatHistory,
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: 'Mock offline response.' }] }
      ]
    }
  }

  const genAI = new GoogleGenerativeAI(apiKey!)
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_INSTRUCTION,
  })

  // Format history messages into Gemini SDK format
  const formattedContents: any[] = chatHistory.map((h) => ({
    role: h.role,
    parts: h.parts,
  }))

  // Add the new user prompt
  formattedContents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  })

  try {
    // Initial request with tool declarations
    let response = await model.generateContent({
      contents: formattedContents,
      tools: [{ functionDeclarations } as any],
    })

    let responseText = ''
    const functionCalls = response.response.functionCalls ? response.response.functionCalls() : undefined

    // Tool execution loop
    if (functionCalls && functionCalls.length > 0) {
      const functionResponseParts: any[] = []

      for (const call of functionCalls) {
        const { name, args } = call
        let resultData: any = null

        if (name === 'getHouseholdAccounts') {
          resultData = await getHouseholdAccounts(householdId)
        } else if (name === 'getHouseholdTransactions') {
          const limit = (args as any).limit || 20
          const category = (args as any).category || undefined
          resultData = await getHouseholdTransactions(householdId, limit, category)
        } else if (name === 'getHouseholdBills') {
          resultData = await getHouseholdBills(householdId)
        } else if (name === 'getHouseholdSavingsGoals') {
          resultData = await getHouseholdSavingsGoals(householdId)
        }

        functionResponseParts.push({
          functionResponse: {
            name: name,
            response: { content: resultData },
          },
        })
      }

      // Append model call and functions outputs to contents history
      formattedContents.push(response.response.candidates?.[0]?.content)
      formattedContents.push({
        role: 'function',
        parts: functionResponseParts,
      })

      // Generate final response from Gemini with function details context
      const finalResult = await model.generateContent({
        contents: formattedContents,
      })
      responseText = finalResult.response.text() || 'No answer generated.'
    } else {
      responseText = response.response.text() || 'No answer generated.'
    }

    // Return final answer and history updates
    const finalHistory = [
      ...chatHistory,
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: responseText }] }
    ]

    return {
      answer: responseText,
      history: finalHistory,
    }
  } catch (err: any) {
    console.error('Gemini execution error:', err)
    return {
      answer: `I encountered an issue querying the Gemini AI service: ${err.message || 'Unknown LLM error'}.`,
      history: chatHistory,
    }
  }
}

export async function classifyTransactionCategory(merchantName: string): Promise<{
  isRecurring: boolean
  category: 'Utilities' | 'Subscriptions' | 'Home Security' | 'Membership' | 'Housing' | 'Transportation' | 'Financing' | 'Other'
  suggestedName: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semiannually' | 'annually' | 'irregular'
  confidence: number
}> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return {
      isRecurring: false,
      category: 'Other',
      suggestedName: merchantName,
      frequency: 'monthly',
      confidence: 0.0,
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    // Use the fast, low-cost flash model
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const prompt = `Analyze the raw bank transaction merchant name: "${merchantName}".
Determine:
1. Is this transaction a recurring charge (e.g. utility, subscription, membership, loan, mortgage, rent, or insurance)?
2. Which category fits best? Select from: 'Utilities', 'Subscriptions', 'Home Security', 'Membership', 'Housing', 'Transportation', 'Financing', or 'Other'.
3. What is a clean, human-readable name for this bill? (e.g., "Netflix" instead of "NETFLIX_MEMBER_1234", or "Comcast" instead of "XFINITY_COMCAST_PAY").
4. What is the expected frequency? Select from: 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually', or 'irregular'.
5. What is your confidence score (0.0 to 1.0) on this classification?

Return ONLY a JSON object:
{
  "isRecurring": boolean,
  "category": "Utilities" | "Subscriptions" | "Home Security" | "Membership" | "Housing" | "Transportation" | "Financing" | "Other",
  "suggestedName": string,
  "frequency": "weekly" | "biweekly" | "monthly" | "quarterly" | "semiannually" | "annually" | "irregular",
  "confidence": number
}`

    const response = await model.generateContent(prompt)
    const text = response.response.text()
    if (!text) throw new Error('Empty model response')

    const parsed = JSON.parse(text)
    return {
      isRecurring: !!parsed.isRecurring,
      category: parsed.category || 'Other',
      suggestedName: parsed.suggestedName || merchantName,
      frequency: parsed.frequency || 'monthly',
      confidence: parsed.confidence || 0.0,
    }
  } catch (err) {
    console.error('Error in transaction classification via Gemini:', err)
    return {
      isRecurring: false,
      category: 'Other',
      suggestedName: merchantName,
      frequency: 'monthly',
      confidence: 0.0,
    }
  }
}

export async function analyzeTransactionDispute(params: {
  merchantName: string
  amount: number
  date: string
  category: string
  disputeReason: string
  userNotes?: string
}): Promise<{
  merchantName: string
  strategySummary: string
  legalPolicyLeverage: string[]
  phoneScript: {
    opening: string
    keyPoints: string[]
    escalationIfDenied: string
  }
  emailDraft: string
  bankDisputeReasonCode: string
  bankDisputeLetter: string
}> {
  const { merchantName, amount, date, category, disputeReason, userNotes } = params

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your-gemini-api-key') {
    return {
      merchantName,
      strategySummary: `Offline Sandbox Negotiation Plan for ${merchantName} ($${amount.toFixed(2)}).`,
      legalPolicyLeverage: [
        'FTC Unfair and Deceptive Practices Rule (16 CFR Part 425)',
        'Visa Chargeback Reason Code 13.1 (Services Not Provided)',
        'Merchant 30-Day Consumer Satisfaction Guarantee Policy',
      ],
      phoneScript: {
        opening: `Hello, I am calling regarding my recent charge of $${amount.toFixed(2)} from ${merchantName} on ${date}. I am requesting a full refund as I have not utilized this service.`,
        keyPoints: [
          'State clearly that account logs confirm 0 usage over the billing period.',
          'Reference the initial agreement terms regarding unfulfilled service or satisfaction guarantees.',
          'Request a supervisor or retention department if representative states "policy prevents refunds".',
        ],
        escalationIfDenied: `If you are unable to issue a refund, please transfer me to your retention manager or billing supervisor, as I will need to file a formal dispute with my card issuer under Reason Code 13.1.`,
      },
      emailDraft: `Subject: Formal Refund & Account Settlement Request - ${merchantName} ($${amount.toFixed(2)})\n\nDear Customer Support,\n\nI am writing to request a full refund of $${amount.toFixed(2)} charged on ${date} for ${merchantName}.\n\nReason: ${disputeReason}. ${userNotes ? `Additional Context: ${userNotes}` : ''}\n\nOur account records indicate zero utilization during this billing period. Under consumer protection guidelines and your service terms, I request this charge be refunded to my original payment method.\n\nThank you,\nAccount Support Advocate`,
      bankDisputeReasonCode: 'Visa 13.1 / Mastercard 4853 (Services Not Rendered)',
      bankDisputeLetter: `I am disputing the transaction of $${amount.toFixed(2)} from ${merchantName} dated ${date}. I attempted to resolve this directly with the merchant, but the service was unused/unrendered. I request a credit to my account under credit card billing error rights.`,
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    })

    const prompt = `You are Canvora's Consumer Advocate AI. A user wants to dispute, request a refund, or negotiate a better deal for a transaction.
Transaction Details:
- Merchant Name: "${merchantName}"
- Amount: $${amount.toFixed(2)}
- Transaction Date: "${date}"
- Category: "${category}"
- User Dispute Goal: "${disputeReason}"
- Additional Context/Notes: "${userNotes || 'None provided'}"

Analyze the merchant's known refund policy, FTC consumer protection rules, card network chargeback reason codes (Visa/Mastercard), and high-persuasion negotiation tactics.

Generate a JSON object response matching this exact structure:
{
  "merchantName": string,
  "strategySummary": "A concise 2-sentence breakdown of the recommended strategy.",
  "legalPolicyLeverage": ["array of 3 specific policy rules, terms, FTC rules, or contract clauses to quote"],
  "phoneScript": {
    "opening": "Exact opening sentence to say to phone support",
    "keyPoints": ["3 firm bullet points to state during the call"],
    "escalationIfDenied": "Exact script to say if representative says no or cites strict company policy"
  },
  "emailDraft": "Complete, professional email or chat transcript draft ready to send",
  "bankDisputeReasonCode": "Official credit card chargeback code (e.g. Visa 13.1 / Mastercard 4853)",
  "bankDisputeLetter": "Strict, formal letter text to submit to Chase / BofA / Apple Card if merchant refuses refund"
}`

    const response = await model.generateContent(prompt)
    const text = response.response.text()
    if (!text) throw new Error('Empty model response')

    const parsed = JSON.parse(text)
    return {
      merchantName: parsed.merchantName || merchantName,
      strategySummary: parsed.strategySummary || `AI Dispute Strategy for ${merchantName}.`,
      legalPolicyLeverage: parsed.legalPolicyLeverage || ['FTC Billing Guidelines', 'Card Network Rights'],
      phoneScript: parsed.phoneScript || {
        opening: `Hello, I'm calling to request a refund for $${amount.toFixed(2)} from ${merchantName}.`,
        keyPoints: ['Unused service', 'Request full refund'],
        escalationIfDenied: 'Please transfer me to billing supervisor.',
      },
      emailDraft: parsed.emailDraft || `Requesting refund of $${amount.toFixed(2)} for ${merchantName}.`,
      bankDisputeReasonCode: parsed.bankDisputeReasonCode || 'Visa 13.1 (Services Not Rendered)',
      bankDisputeLetter: parsed.bankDisputeLetter || `Disputing transaction of $${amount.toFixed(2)} from ${merchantName}.`,
    }
  } catch (err: any) {
    console.error('Error analyzing transaction dispute with Gemini:', err)
    return {
      merchantName,
      strategySummary: `Standard Refund Request for ${merchantName} ($${amount.toFixed(2)}).`,
      legalPolicyLeverage: ['Consumer Contract Rights', 'FTC Unfair Practices Standard'],
      phoneScript: {
        opening: `Hello, I am calling about the $${amount.toFixed(2)} charge on ${date}. I am requesting a refund as the service was not utilized.`,
        keyPoints: ['Highlight zero usage', 'Request refund to original card'],
        escalationIfDenied: 'I will escalate to my card issuer if unresolved.',
      },
      emailDraft: `Dear Support,\n\nPlease refund $${amount.toFixed(2)} for ${merchantName} dated ${date}.\n\nThank you.`,
      bankDisputeReasonCode: 'Visa 13.1',
      bankDisputeLetter: `Disputing $${amount.toFixed(2)} charge from ${merchantName}.`,
    }
  }
}

