'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Brain, Loader, Sparkles, Settings, Check, X, Bug, RefreshCw, Save, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import axios from 'axios'

// Custom CSS for animations
const customStyles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(147, 51, 234, 0); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.6s ease-out;
  }
  
  .animate-slide-down {
    animation: slide-down 0.4s ease-out;
  }
  
  .animate-pulse-glow {
    animation: pulse-glow 2s infinite;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

interface SubjectScore {
  correct: number
  total: number
}

interface GeneratedQuestion {
  question: string
  correct_answer: string
  incorrect_answers: string[]
  explanation: string
  img?: string
  class_name: string
  exam_name: string
  subject: string
  custom?: {
    generatedBy: string
    model?: string
    difficulty: string
    bloomsLevel: string
    topicFocus?: string
    qualityScore?: number
    qualityIssues?: string[]
    needsReview?: boolean
  }
}

interface AIParams {
  subject: string
  class_name: string
  exam_name: string
  numQuestions: number
  difficulty: 'easy' | 'medium' | 'hard' | 'advanced'
  topicFocus: string
  model: string
  questionType: 'multiple_choice' | 'true_false' | 'short_answer'
  bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
  includeImages: boolean
  validateAnswers: boolean
}

interface DebugInfo {
  visible: boolean
  message: string
  details: string
}

interface QualityMetrics {
  grammarScore: number
  difficultyConsistency: number
  answerDistribution: number
  overallScore: number
}

interface AIModel {
  id: string
  name: string
  description: string
  tier: 'basic' | 'standard' | 'premium'
}

export default function AIQuestionGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [showReviewMode, setShowReviewMode] = useState(false)
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({ visible: false, message: '', details: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Data states
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])


  const [aiParams, setAiParams] = useState<AIParams>({
    subject: '',
    class_name: '',
    exam_name: '',
    numQuestions: 3,
    difficulty: 'medium',
    topicFocus: '',
    model: 'anthropic/claude-3-haiku',
    questionType: 'multiple_choice',
    bloomsLevel: 'understand',
    includeImages: false,
    validateAnswers: true
  })

  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    grammarScore: 0,
    difficultyConsistency: 0,
    answerDistribution: 0,
    overallScore: 0
  })

  // Professional AI models for educational content generation
  const models: AIModel[] = [
    {
      id: 'anthropic/claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      description: 'Best for complex educational content',
      tier: 'premium'
    },
    {
      id: 'anthropic/claude-3-haiku',
      name: 'Claude 3 Haiku',
      description: 'Fast and accurate for standard questions',
      tier: 'standard'
    },
    {
      id: 'openai/gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Reliable for educational assessments',
      tier: 'standard'
    },
    {
      id: 'openai/gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Cost-effective for basic questions',
      tier: 'basic'
    }
  ]

  // Question quality standards
  const qualityStandards = {
    minQuestionLength: 10,
    maxQuestionLength: 500,
    minAnswerLength: 2,
    maxAnswerLength: 200,
    minExplanationLength: 20,
    maxExplanationLength: 300,
    requiredFields: ['question', 'correct_answer', 'incorrect_answers', 'explanation']
  }

  // Load API key from localStorage if available
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openrouter_api_key')
    if (savedApiKey) {
      setApiKey(savedApiKey)
    }
  }, [])

  // Fetch data from API with better error handling
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Attempting to fetch data from API...')
      
      // Fetch classes
      const classesResponse = await fetch(`http://localhost:80/api/Classes`, {
        headers: { authorization: '4000' }
      })
      
      if (classesResponse.ok) {
        const classesData = await classesResponse.json()
        console.log('Classes data received:', classesData)
        setClasses(classesData.Class || classesData.classes || classesData || [])
      } else {
        console.error('Classes API failed:', classesResponse.status, classesResponse.statusText)
        throw new Error(`Classes API returned ${classesResponse.status}`)
      }

      // Fetch subjects
      const subjectsResponse = await fetch(`http://localhost:80/api/Subject`, {
        headers: { authorization: '4000' }
      })
      
      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json()
        console.log('Subjects data received:', subjectsData)
        setSubjects(subjectsData.Subject || subjectsData.subjects || subjectsData || [])
      } else {
        console.error('Subjects API failed:', subjectsResponse.status, subjectsResponse.statusText)
        throw new Error(`Subjects API returned ${subjectsResponse.status}`)
      }

      // Fetch exams
      const examsResponse = await fetch(`http://localhost:80/api/ExamCombination`, {
        headers: { authorization: '4000' }
      })
      
      if (examsResponse.ok) {
        const examsData = await examsResponse.json()
        console.log('Exams data received:', examsData)
        setExams(examsData.Exam || examsData.exams || examsData || [])
      } else {
        console.error('Exams API failed:', examsResponse.status, examsResponse.statusText)
        throw new Error(`Exams API returned ${examsResponse.status}`)
      }

      setSuccess('Data loaded successfully!')

    } catch (err: any) {
      console.error('Error fetching data:', err)
      
      let errorMessage = 'Failed to fetch data from server. '
      
      if (err.message.includes('fetch')) {
        errorMessage += 'Cannot connect to http://localhost:80. Please check if your API server is running.'
      } else {
        errorMessage += err.message
      }
      
      setError(errorMessage)
      
      // Add some sample data for testing
      console.log('Adding sample data for testing...')
      setClasses([
        { id: 1, name: 'Class 1' },
        { id: 2, name: 'Class 2' },
        { id: 3, name: 'Class 3' }
      ])
      setSubjects([
        { id: 1, name: 'Mathematics' },
        { id: 2, name: 'Science' },
        { id: 3, name: 'English' },
        { id: 4, name: 'History' }
      ])
      setExams([
        { id: 1, exam_name: 'Midterm Exam' },
        { id: 2, exam_name: 'Final Exam' },
        { id: 3, exam_name: 'Quiz 1' }
      ])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setAiParams((prev) => ({
      ...prev,
      [name]: name === 'numQuestions' ? parseInt(value) || 1 : value
    }))
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setApiKey(value)
    localStorage.setItem('openrouter_api_key', value)
  }

  // Show debug info
  const showDebug = (message: string, details = '') => {
    setDebugInfo({
      visible: true,
      message,
      details
    })
  }

  // Hide debug info
  const hideDebug = () => {
    setDebugInfo({
      visible: false,
      message: '',
      details: ''
    })
  }

  // Test API connection
  const testApiConnection = async () => {
    if (!apiKey) {
      setError('Please enter your OpenRouter API key')
      return
    }

    setIsGenerating(true)
    setDebugInfo({ visible: false, message: '', details: '' })

    try {
      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions'

      const response = await axios.post(
        apiUrl,
        {
          model: aiParams.model,
          messages: [{ role: 'user', content: 'Hello, are you working?' }]
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'Question Generator App',
            'Content-Type': 'application/json'
          }
        }
      )

      showDebug(
        'API Connection Successful',
        `Response status: ${response.status}\n` +
          `Model: ${response.data.model}\n` +
          `Raw response: ${JSON.stringify(response.data.choices[0], null, 2)}`
      )
      setSuccess('API connection test successful!')
    } catch (error: any) {
      console.error('API connection test failed:', error)

      const errorDetails = error.response
        ? `Status: ${error.response.status}\nData: ${JSON.stringify(error.response.data, null, 2)}`
        : `Error: ${error.message}`

      showDebug('API Connection Failed', errorDetails)
      setError(`API connection failed: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Validate question quality
  const validateQuestionQuality = (question: GeneratedQuestion) => {
    const issues: string[] = []

    if (question.question.length < qualityStandards.minQuestionLength) {
      issues.push('Question too short')
    }
    if (question.question.length > qualityStandards.maxQuestionLength) {
      issues.push('Question too long')
    }

    if (question.correct_answer.length < qualityStandards.minAnswerLength) {
      issues.push('Correct answer too short')
    }

    const allAnswers = [question.correct_answer, ...question.incorrect_answers]
    const uniqueAnswers = new Set(allAnswers.map((a) => a.toLowerCase().trim()))
    if (uniqueAnswers.size !== allAnswers.length) {
      issues.push('Duplicate answers detected')
    }

    if (question.explanation.length < qualityStandards.minExplanationLength) {
      issues.push('Explanation too brief')
    }

    for (const field of qualityStandards.requiredFields) {
      if (!question[field as keyof GeneratedQuestion] || 
          (Array.isArray(question[field as keyof GeneratedQuestion]) && 
           (question[field as keyof GeneratedQuestion] as any[]).length === 0)) {
        issues.push(`Missing ${field}`)
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, 100 - issues.length * 20)
    }
  }

  // Create professional fallback questions
  const createProfessionalQuestion = (index: number): GeneratedQuestion => {
    const professionalQuestions: Record<string, any[]> = {
      Mathematics: [
        {
          question: 'A rectangle has a length of 12 cm and a width of 8 cm. What is its perimeter?',
          correct_answer: '40 cm',
          incorrect_answers: ['32 cm', '48 cm', '96 cm'],
          explanation: 'The perimeter of a rectangle is calculated using the formula P = 2(l + w). Therefore, P = 2(12 + 8) = 2(20) = 40 cm.',
          bloomsLevel: 'apply'
        },
        {
          question: 'If 3x + 7 = 22, what is the value of x?',
          correct_answer: '5',
          incorrect_answers: ['4', '6', '7'],
          explanation: 'To solve 3x + 7 = 22, subtract 7 from both sides: 3x = 15, then divide by 3: x = 5.',
          bloomsLevel: 'apply'
        }
      ],
      Science: [
        {
          question: 'Which process allows plants to convert sunlight into chemical energy?',
          correct_answer: 'Photosynthesis',
          incorrect_answers: ['Respiration', 'Transpiration', 'Germination'],
          explanation: 'Photosynthesis is the process by which plants use chlorophyll to capture sunlight and convert carbon dioxide and water into glucose and oxygen.',
          bloomsLevel: 'understand'
        }
      ]
    }

    const subjectQuestions = professionalQuestions[aiParams.subject] || professionalQuestions['Science']
    const randomIndex = Math.floor(Math.random() * subjectQuestions.length)
    const questionTemplate = subjectQuestions[randomIndex]

    return {
      ...questionTemplate,
      img: '',
      class_name: aiParams.class_name,
      exam_name: aiParams.exam_name,
      subject: aiParams.subject,
      custom: {
        generatedBy: 'Professional Template',
        difficulty: aiParams.difficulty,
        bloomsLevel: questionTemplate.bloomsLevel || aiParams.bloomsLevel,
        qualityScore: 85
      }
    }
  }

  // Generate questions using templates
  const generateManualQuestions = () => {
    if (!aiParams.subject || !aiParams.class_name) {
      setError('Please fill all required fields')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGeneratedQuestions([])

    try {
      const questions: GeneratedQuestion[] = []
      const totalQuestions = aiParams.numQuestions

      for (let i = 0; i < totalQuestions; i++) {
        questions.push(createProfessionalQuestion(i))
        setGenerationProgress(Math.round(((i + 1) / totalQuestions) * 100))
      }

      setGenerationProgress(100)
      setGeneratedQuestions(questions)
      setShowReviewMode(true)
      setCurrentReviewIndex(0)

      setSuccess(`Generated ${questions.length} questions. Please review before saving.`)
    } catch (error: any) {
      console.error('Error in manual question generation:', error)
      setError(`Generation failed: ${error.message || 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate questions using AI
  const generateQuestions = async () => {
    if (!aiParams.subject || !aiParams.class_name) {
      setError('Please fill all required fields')
      return
    }

    if (aiParams.numQuestions <= 0 || aiParams.numQuestions > 10) {
      setError('Number of questions must be between 1 and 10')
      return
    }

    if (!apiKey) {
      setError('Please enter your OpenRouter API key')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGeneratedQuestions([])
    hideDebug()

    try {
      const questions: GeneratedQuestion[] = []
      const apiUrl = 'https://openrouter.ai/api/v1/chat/completions'

      const createProfessionalPrompt = () => {
        const bloomsLevels: Record<string, string> = {
          remember: 'recall facts and basic concepts',
          understand: 'explain ideas or concepts',
          apply: 'use information in new situations',
          analyze: 'draw connections among ideas',
          evaluate: 'justify a stand or decision',
          create: 'produce new or original work'
        }

        return `You are an expert educational assessment designer. Generate ${aiParams.numQuestions} high-quality multiple choice questions for ${aiParams.subject} at ${aiParams.difficulty} difficulty level for ${aiParams.class_name} students.

REQUIREMENTS:
- Target Bloom's Taxonomy Level: ${aiParams.bloomsLevel} (${bloomsLevels[aiParams.bloomsLevel]})
- Subject: ${aiParams.subject}
- Class Level: ${aiParams.class_name}
- Difficulty: ${aiParams.difficulty}
${aiParams.topicFocus ? `- Topic Focus: ${aiParams.topicFocus}` : ''}

QUALITY STANDARDS:
1. Questions must be clear, unambiguous, and grammatically correct
2. Correct answers must be definitively correct
3. Incorrect answers (distractors) must be plausible but clearly wrong
4. Avoid "all of the above" or "none of the above" options
5. Explanations must be educational and help students learn
6. Questions should test understanding, not just memorization
7. Use appropriate academic vocabulary for the grade level

FORMAT: Return ONLY a JSON array with this exact structure:

\`\`\`json
[
  {
    "question": "Clear, specific question text ending with a question mark?",
    "correct_answer": "The one definitively correct answer",
    "incorrect_answers": ["Plausible wrong answer 1", "Plausible wrong answer 2", "Plausible wrong answer 3"],
    "explanation": "Clear explanation of why the correct answer is right and why others are wrong",
    "difficulty_level": "${aiParams.difficulty}",
    "blooms_level": "${aiParams.bloomsLevel}",
    "topic": "${aiParams.topicFocus || 'General ' + aiParams.subject}"
  }
]
\`\`\`

Generate exactly ${aiParams.numQuestions} question(s). Ensure each question meets professional educational standards.`
      }

      setGenerationProgress(10)

      const response = await axios.post(
        apiUrl,
        {
          model: aiParams.model,
          messages: [
            {
              role: 'system',
              content: `You are a professional educational assessment designer with expertise in creating high-quality, pedagogically sound multiple choice questions. You follow strict quality standards and educational best practices. Always return properly formatted JSON without any additional text.`
            },
            { role: 'user', content: createProfessionalPrompt() }
          ],
          temperature: 0.3,
          max_tokens: 3000,
          top_p: 0.9
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.href,
            'X-Title': 'Question Generator App',
            'Content-Type': 'application/json'
          }
        }
      )

      setGenerationProgress(70)

      const responseContent = response.data.choices[0].message.content
      console.log('Raw API response:', responseContent)

      try {
        let jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/)
        let jsonContent

        if (jsonMatch) {
          jsonContent = jsonMatch[1]
        } else {
          jsonMatch = responseContent.match(/\[\s*\{[\s\S]*\}\s*\]/)
          if (jsonMatch) {
            jsonContent = jsonMatch[0]
          } else {
            jsonMatch = responseContent.match(/\[([\s\S]*?)\]/)
            jsonContent = jsonMatch ? jsonMatch[0] : responseContent
          }
        }

        jsonContent = jsonContent.trim()
        const parsedQuestions = JSON.parse(jsonContent)

        if (Array.isArray(parsedQuestions)) {
          parsedQuestions.forEach((q: any) => {
            if (q.question && q.correct_answer && q.incorrect_answers && q.explanation) {
              let incorrectAnswers = [...q.incorrect_answers]
              while (incorrectAnswers.length < 3) {
                incorrectAnswers.push(`Alternative ${incorrectAnswers.length + 1}`)
              }
              if (incorrectAnswers.length > 3) {
                incorrectAnswers = incorrectAnswers.slice(0, 3)
              }

              const questionObj: GeneratedQuestion = {
                question: q.question.trim(),
                correct_answer: q.correct_answer.trim(),
                incorrect_answers: incorrectAnswers.map((a: string) => a.trim()),
                explanation: q.explanation.trim(),
                img: '',
                class_name: aiParams.class_name,
                exam_name: aiParams.exam_name,
                subject: aiParams.subject,
                custom: {
                  generatedBy: 'AI (OpenRouter)',
                  model: aiParams.model,
                  difficulty: q.difficulty_level || aiParams.difficulty,
                  bloomsLevel: q.blooms_level || aiParams.bloomsLevel,
                  topicFocus: q.topic || aiParams.topicFocus || 'General'
                }
              }

              const qualityCheck = validateQuestionQuality(questionObj)
              questionObj.custom!.qualityScore = qualityCheck.score
              questionObj.custom!.qualityIssues = qualityCheck.issues

              if (qualityCheck.isValid || qualityCheck.score >= 60) {
                questions.push(questionObj)
              } else {
                console.warn(`Question failed quality check:`, qualityCheck.issues)
                questionObj.custom!.needsReview = true
                questions.push(questionObj)
              }
            }
          })
        }

        if (questions.length === 0) {
          throw new Error('Failed to parse valid questions from response')
        }
      } catch (parseError: any) {
        console.error('Error parsing response:', parseError)
        showDebug(
          'Error Parsing AI Response',
          `Error: ${parseError.message}\nRaw Response: ${responseContent}`
        )

        // Use fallback questions
        for (let i = 0; i < aiParams.numQuestions; i++) {
          questions.push(createProfessionalQuestion(i))
        }
      }

      while (questions.length < aiParams.numQuestions) {
        questions.push(createProfessionalQuestion(questions.length))
      }

      const finalQuestions = questions.slice(0, aiParams.numQuestions)

      setGenerationProgress(100)
      setGeneratedQuestions(finalQuestions)
      setShowReviewMode(true)
      setCurrentReviewIndex(0)

      setSuccess(`Generated ${finalQuestions.length} questions. Please review before saving.`)
    } catch (error: any) {
      console.error('Error in question generation process:', error)

      const errorDetails = error.response
        ? `Status: ${error.response.status}\nData: ${JSON.stringify(error.response.data, null, 2)}`
        : `Error: ${error.message}`

      showDebug('Generation Process Failed', errorDetails)
      setError(`Generation failed: ${error.message || 'Unknown error'}`)

      try {
        const fallbackQuestions: GeneratedQuestion[] = []
        for (let i = 0; i < aiParams.numQuestions; i++) {
          fallbackQuestions.push(createProfessionalQuestion(i))
        }
        setGeneratedQuestions(fallbackQuestions)
        setShowReviewMode(true)
        setCurrentReviewIndex(0)
        setSuccess('Using high-quality template questions. Please review and customize.')
      } catch (fallbackError: any) {
        console.error('Error generating fallback questions:', fallbackError)
        setError('Failed to generate any questions. Please check your settings.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Save questions to database
  const saveGeneratedQuestions = async () => {
    try {
      setIsGenerating(true)
      let savedCount = 0

      for (const question of generatedQuestions) {
        await axios.post(`http://localhost:80/api/Question`, question, {
          headers: {
            authorization: '4000'
          }
        })
        savedCount++
        setGenerationProgress(Math.round((savedCount / generatedQuestions.length) * 100))
      }

      setSuccess(`Saved ${savedCount} questions successfully!`)
      
      // Reset states
      setShowReviewMode(false)
      setGeneratedQuestions([])
      setCurrentReviewIndex(0)
    } catch (error: any) {
      console.error('Error saving questions:', error)
      setError('Failed to save questions')
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  // Update question during review
  const updateQuestionInReview = (field: keyof GeneratedQuestion, value: any) => {
    setGeneratedQuestions((prev) => {
      const updated = [...prev]
      updated[currentReviewIndex] = {
        ...updated[currentReviewIndex],
        [field]: value
      }
      return updated
    })
  }

  // Update incorrect answer during review
  const updateIncorrectAnswer = (index: number, value: string) => {
    setGeneratedQuestions((prev) => {
      const updated = [...prev]
      const newIncorrectAnswers = [...updated[currentReviewIndex].incorrect_answers]
      newIncorrectAnswers[index] = value

      updated[currentReviewIndex] = {
        ...updated[currentReviewIndex],
        incorrect_answers: newIncorrectAnswers
      }
      return updated
    })
  }

  // Navigation for review mode
  const goToNextQuestion = () => {
    if (currentReviewIndex < generatedQuestions.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1)
    }
  }

  const goToPrevQuestion = () => {
    if (currentReviewIndex > 0) {
      setCurrentReviewIndex((prev) => prev - 1)
    }
  }

  // Clear messages
  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="min-h-screen text-[10px]">
      {/* Status Messages */}
      {(error || success) && (
        <div className="animate-slide-down">
          {error && (
            <div className="bg-red-500 text-white px-1 py-[2px] flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">{error}</span>
              </div>
              <button 
                onClick={clearMessages} 
                className="hover:text-red-600 transition-colors duration-200 p-1 rounded-full hover:bg-red-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="bg-green-500 text-white px-1 py-[2px] flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">{success}</span>
              </div>
              <button 
                onClick={clearMessages} 
                className="transition-colors duration-200 p-1 rounded-full hover:bg-green-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold">
                AI Question Generator
              </h1>
              <p className="text-slate-600 mt-2">Generate high-quality educational questions using AI</p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-all duration-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Debug Info Panel */}
        {debugInfo.visible && (
          <div className="bg-white border border-slate-300 p-4 rounded-lg mb-6 animate-slide-down">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{debugInfo.message}</h3>
              <button onClick={hideDebug} className="text-slate-500 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            {debugInfo.details && (
              <pre className="mt-2 bg-slate-100 border p-2 rounded text-xs overflow-auto max-h-48">
                {debugInfo.details}
              </pre>
            )}
          </div>
        )}

        <div className="flex w-full space-x-2 p-4">
          {/* Main Content */}
          <div className="w-full">
            {isGenerating ? (
              <div className="bg-white rounded border p-8 animate-fade-in">
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <Loader className="w-8 h-8 text-white animate-spin" />
                  </div>
                  <h3 className="font-medium text-slate-700 mb-2">
                    {generatedQuestions.length > 0 ? 'Saving Questions...' : 'Generating Questions...'}
                  </h3>
                  <div className="w-64 bg-slate-200 rounded-full h-2 mb-4">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <p className="text-slate-500">Please wait, this may take a minute</p>
                </div>
              </div>
            ) : showReviewMode ? (
              <div className="bg-white rounded border p-6 animate-fade-in">
                {/* Review Mode */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-medium text-slate-700">
                    Question {currentReviewIndex + 1} of {generatedQuestions.length}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={goToPrevQuestion}
                      disabled={currentReviewIndex === 0}
                      className={`px-3 py-1 rounded ${
                        currentReviewIndex === 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={goToNextQuestion}
                      disabled={currentReviewIndex === generatedQuestions.length - 1}
                      className={`px-3 py-1 rounded ${
                        currentReviewIndex === generatedQuestions.length - 1
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>

                {/* Quality Indicators */}
                {generatedQuestions[currentReviewIndex]?.custom && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-blue-800">Quality Score</span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full ${
                            (generatedQuestions[currentReviewIndex].custom?.qualityScore || 0) >= 80
                              ? 'bg-green-100 text-green-800'
                              : (generatedQuestions[currentReviewIndex].custom?.qualityScore || 0) >= 60
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {generatedQuestions[currentReviewIndex].custom?.qualityScore || 'N/A'}%
                        </span>
                        {generatedQuestions[currentReviewIndex].custom?.needsReview && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                            Needs Review
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-blue-700">
                      <div>
                        Bloom's: {generatedQuestions[currentReviewIndex].custom?.bloomsLevel || 'N/A'}
                      </div>
                      <div>
                        Generated by: {generatedQuestions[currentReviewIndex].custom?.generatedBy}
                      </div>
                    </div>
                    {generatedQuestions[currentReviewIndex]?.custom?.qualityIssues?.length && (
                      <div className="mt-2">
                        <span className="text-red-600">Issues: </span>
                        <span className="text-red-600">
                          {generatedQuestions[currentReviewIndex]?.custom?.qualityIssues?.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Question Editor */}
                <div className="space-y-4">
                  <div className="bg-slate-50 border p-4 rounded">
                    <label className="block font-medium text-slate-700 mb-2">Question</label>
                    <textarea
                      value={generatedQuestions[currentReviewIndex]?.question || ''}
                      onChange={(e) => updateQuestionInReview('question', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 p-4 rounded">
                    <label className="block font-medium text-slate-700 mb-2">Correct Answer</label>
                    <input
                      type="text"
                      value={generatedQuestions[currentReviewIndex]?.correct_answer || ''}
                      onChange={(e) => updateQuestionInReview('correct_answer', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="bg-red-50 border border-red-100 p-4 rounded">
                    <label className="block font-medium text-slate-700 mb-2">Incorrect Answers</label>
                    {generatedQuestions[currentReviewIndex]?.incorrect_answers?.map((answer, idx) => (
                      <div key={idx} className="mb-2">
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => updateIncorrectAnswer(idx, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder={`Incorrect Answer ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded">
                    <label className="block font-medium text-slate-700 mb-2">Explanation</label>
                    <textarea
                      value={generatedQuestions[currentReviewIndex]?.explanation || ''}
                      onChange={(e) => updateQuestionInReview('explanation', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Explanation for the correct answer"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={generatedQuestions[currentReviewIndex]?.subject || ''}
                        onChange={(e) => updateQuestionInReview('subject', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">Class</label>
                      <input
                        type="text"
                        value={generatedQuestions[currentReviewIndex]?.class_name || ''}
                        onChange={(e) => updateQuestionInReview('class_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1">Exam</label>
                      <input
                        type="text"
                        value={generatedQuestions[currentReviewIndex]?.exam_name || ''}
                        onChange={(e) => updateQuestionInReview('exam_name', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    onClick={saveGeneratedQuestions}
                    className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    Save All Questions
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded border p-6 animate-fade-in">
                {/* Generator Form */}
                <h2 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  Question Generator
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block font-medium text-slate-700 mb-2">Subject</label>
                    <select
                      name="subject"
                      value={aiParams.subject}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.name}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-2">Class</label>
                    <select
                      name="class_name"
                      value={aiParams.class_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.name}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-2">Exam</label>
                    <select
                      name="exam_name"
                      value={aiParams.exam_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Exam</option>
                      {exams.map((exam) => (
                        <option key={exam.id} value={exam.exam_name}>
                          {exam.exam_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-2">Number of Questions</label>
                    <input
                      type="number"
                      name="numQuestions"
                      min="1"
                      max="10"
                      value={aiParams.numQuestions}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-2">Difficulty</label>
                    <select
                      name="difficulty"
                      value={aiParams.difficulty}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-2">Bloom's Level</label>
                    <select
                      name="bloomsLevel"
                      value={aiParams.bloomsLevel}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="remember">Remember (Recall facts)</option>
                      <option value="understand">Understand (Explain concepts)</option>
                      <option value="apply">Apply (Use in new situations)</option>
                      <option value="analyze">Analyze (Draw connections)</option>
                      <option value="evaluate">Evaluate (Make judgments)</option>
                      <option value="create">Create (Produce original work)</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block font-medium text-slate-700 mb-2">Topic Focus (Optional)</label>
                  <textarea
                    name="topicFocus"
                    value={aiParams.topicFocus}
                    onChange={handleInputChange}
                    placeholder="e.g. Quadratic Equations, Photosynthesis, World War II"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={2}
                  />
                </div>

                <div className="mb-6">
                  <label className="block font-medium text-slate-700 mb-2">AI Model</label>
                  <select
                    name="model"
                    value={aiParams.model}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {models.find((m) => m.id === aiParams.model)?.tier === 'premium' &&
                      '⭐ Premium model for best results'}
                    {models.find((m) => m.id === aiParams.model)?.tier === 'standard' &&
                      '✓ Standard quality'}
                    {models.find((m) => m.id === aiParams.model)?.tier === 'basic' &&
                      '💰 Cost-effective option'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg mb-6">
                  <h4 className="font-medium text-slate-700 mb-3">Quality Settings</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="validateAnswers"
                        checked={aiParams.validateAnswers}
                        onChange={(e) =>
                          setAiParams((prev) => ({ ...prev, validateAnswers: e.target.checked }))
                        }
                        className="rounded"
                      />
                      <span className="text-slate-600">Enable quality validation</span>
                    </label>
                    <div className="text-xs text-slate-500 ml-6">
                      ✓ Grammar and clarity checks
                      <br />
                      ✓ Answer uniqueness validation
                      <br />✓ Educational standards compliance
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block font-medium text-slate-700 mb-2">OpenRouter API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={handleApiKeyChange}
                    placeholder="Enter your OpenRouter API key"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Get your API key from <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">OpenRouter.ai</a>
                  </p>
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={testApiConnection}
                    title="Test API Connection"
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <Bug className="w-4 h-4" />
                    Test API
                  </button>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={generateManualQuestions}
                      title="Generate using professional templates (no API required)"
                      className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      Use Templates
                    </button>
                    <button
                      onClick={generateQuestions}
                      disabled={!apiKey}
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 font-medium ${
                        apiKey
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 focus:ring-purple-500'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Generate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-slate-800 mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Available Subjects:</span>
                  <span className="font-bold text-blue-600">{subjects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Available Classes:</span>
                  <span className="font-bold text-green-600">{classes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Available Exams:</span>
                  <span className="font-bold text-purple-600">{exams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Generated Questions:</span>
                  <span className="font-bold text-orange-600">{generatedQuestions.length}</span>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 text-[10px]" >
              <h3 className="font-bold text-blue-800 mb-4">💡 Tips for Better Questions</h3>
              <ul className="space-y-2  text-blue-700">
                <li>• Be specific with topic focus for targeted questions</li>
                <li>• Use higher Bloom's levels for critical thinking</li>
                <li>• Review and edit generated questions before saving</li>
                <li>• Test API connection before generating</li>
                <li>• Use templates when API is unavailable</li>
              </ul>
            </div>

            {/* Model Info Card */}
            {aiParams.model && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
                <h3 className="font-bold text-purple-800 mb-4">🤖 Current Model</h3>
                {(() => {
                  const currentModel = models.find(m => m.id === aiParams.model)
                  return currentModel ? (
                    <div className="space-y-2">
                      <div className="font-medium text-purple-700">{currentModel.name}</div>
                      <div className="text-purple-600">{currentModel.description}</div>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        currentModel.tier === 'premium' ? 'bg-yellow-100 text-yellow-800' :
                        currentModel.tier === 'standard' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {currentModel.tier.toUpperCase()}
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}