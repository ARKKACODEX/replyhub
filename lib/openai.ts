/**
 * OpenAI Client Library
 * Handles AI chatbot conversations
 */

import OpenAI from 'openai'
import { prisma } from './db'
import { withRetry } from './retry'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

/**
 * Generate chatbot response with context
 */
export async function generateChatbotResponse(params: {
  accountId: string
  userMessage: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  try {
    // Get account and knowledge base
    const account = await prisma.account.findUnique({
      where: { id: params.accountId },
      include: { knowledgeBase: true },
    })

    if (!account || !account.knowledgeBase) {
      throw new Error('Knowledge base not configured')
    }

    const kb = account.knowledgeBase
    const businessInfo = kb.businessInfo as any
    const faqs = (kb.faqs as any[]) || []

    // Build system message with business context
    const systemMessage = `You are ${kb.chatbotName || 'a helpful assistant'} for ${businessInfo.name || account.businessName}.

BUSINESS INFORMATION:
- Name: ${businessInfo.name || account.businessName}
- Description: ${businessInfo.description || 'Professional services'}
- Services: ${(businessInfo.services || []).join(', ')}
- Business Hours: ${businessInfo.hours || 'Monday-Friday 9 AM - 5 PM'}
- Phone: ${businessInfo.phone || account.phone}
- Address: ${businessInfo.address || account.address}

FREQUENTLY ASKED QUESTIONS:
${faqs.map((faq: any) => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

TONE: ${kb.tone} (professional, friendly, or casual)

CAPABILITIES:
${kb.canSchedule ? '- You CAN help schedule appointments' : '- You CANNOT schedule appointments'}
${kb.canAnswerFAQs ? '- You CAN answer questions using the FAQ above' : '- You CANNOT answer detailed questions'}
${kb.canCaptureLead ? '- You CAN collect contact information (name, email, phone)' : '- You CANNOT collect personal information'}

ESCALATION KEYWORDS: ${kb.escalateKeywords.join(', ')}
- If user mentions any of these keywords, politely inform them that a team member will contact them soon.

CUSTOM INSTRUCTIONS:
${kb.instructions || 'Be helpful and professional'}

IMPORTANT RULES:
1. Always stay in character as ${kb.chatbotName}
2. Never make up information not provided above
3. If you don't know something, admit it and offer to connect them with a team member
4. Be concise - keep responses under 150 words
5. Use the tone specified (${kb.tone})
6. For appointments, ask for: preferred date/time, name, phone number
7. Always end with asking if there's anything else you can help with`

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemMessage },
    ]

    // Add conversation history
    if (params.conversationHistory && params.conversationHistory.length > 0) {
      const recentHistory = params.conversationHistory.slice(-10)
      messages.push(...recentHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })))
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: params.userMessage,
    })

    // Call OpenAI with retry logic
    const response = await withRetry(
      async () => {
        return await openai.chat.completions.create({
          model: 'gpt-4-1106-preview',
          messages,
          temperature: 0.7,
          max_tokens: 500,
          presence_penalty: 0.6,
          frequency_penalty: 0.3,
        })
      },
      {
        maxAttempts: 3,
        delayMs: 1000,
        backoff: 'exponential',
      }
    )

    const assistantMessage = response.choices[0].message.content

    if (!assistantMessage) {
      throw new Error('No response from OpenAI')
    }

    // Check for escalation keywords
    const shouldEscalate = kb.escalateKeywords.some((keyword: string) =>
      params.userMessage.toLowerCase().includes(keyword.toLowerCase())
    )

    return {
      message: assistantMessage,
      shouldEscalate,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    }
  } catch (error) {
    console.error('Error generating chatbot response:', error)

    // Fallback response
    return {
      message: "I'm having trouble right now. Please try again in a moment, or call us directly for immediate assistance.",
      shouldEscalate: true,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }
  }
}

/**
 * Extract lead information from conversation
 */
export async function extractLeadInfo(conversationMessages: string[]) {
  try {
    const conversation = conversationMessages.join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: `Extract contact information from the conversation. Return ONLY valid JSON with this exact structure:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "intent": "string describing what they want"
}

Rules:
- Only include information explicitly mentioned
- Phone must be in format +1XXXXXXXXXX or null
- Email must be valid email or null
- If no information found, return all fields as null`,
        },
        {
          role: 'user',
          content: conversation,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const extracted = JSON.parse(response.choices[0].message.content || '{}')

    return {
      name: extracted.name || null,
      email: extracted.email || null,
      phone: extracted.phone || null,
      intent: extracted.intent || null,
    }
  } catch (error) {
    console.error('Error extracting lead info:', error)
    return { name: null, email: null, phone: null, intent: null }
  }
}

/**
 * Generate appointment time suggestions
 */
export async function generateAppointmentSuggestions(params: {
  userRequest: string
  availableSlots: Array<{ date: string; time: string }>
}) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: [
        {
          role: 'system',
          content: `You are a scheduling assistant. Based on the user's request and available time slots, suggest the 3 best options. Be conversational and helpful.`,
        },
        {
          role: 'user',
          content: `User wants: "${params.userRequest}"

Available slots:
${params.availableSlots.map((slot) => `- ${slot.date} at ${slot.time}`).join('\n')}

Suggest 3 best options for the user.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    return response.choices[0].message.content || 'I have several time slots available.'
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return 'Let me help you find a good time.'
  }
}
