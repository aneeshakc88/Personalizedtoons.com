import { GoogleGenAI, Type } from "@google/genai";
import { ImageAnalysisResult } from '../types';

// Get API key from environment variables
const getApiKey = () => {
    return import.meta.env.VITE_API_KEY;
};


const getAiClient = () => {
    const key = getApiKey();
    if (!key) {
        console.error("API Key is missing. Please set VITE_API_KEY in your environment.");
        throw new Error("API Key is missing.");
    }
    return new GoogleGenAI({ apiKey: key });
};

export const analyzeImage = async (base64Image: string): Promise<ImageAnalysisResult> => {
    const ai = getAiClient();

    // Remove data URL prefix if present for the API call
    const base64Data = base64Image.split(',')[1] || base64Image;

    try {
        // gemini-3-flash-preview supports both multimodal input (images) and responseSchema (JSON).
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }
                    },
                    {
                        text: `Analyze this image to determine if it is suitable for creating a personalized face-swap video for a child. 
                I need a clear, unobstructed, well-lit face of a single person (preferably a child). 
                Provide a JSON response.`
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isValid: { type: Type.BOOLEAN, description: "True if the image is generally good for face swapping." },
                        faceCount: { type: Type.INTEGER, description: "Number of faces detected." },
                        isClear: { type: Type.BOOLEAN, description: "True if the face is sharp and not blurry." },
                        lighting: { type: Type.STRING, enum: ["POOR", "GOOD", "EXCELLENT"], description: "Quality of lighting on the face." },
                        score: { type: Type.INTEGER, description: "A suitability score from 0 to 100." },
                        feedback: { type: Type.STRING, description: "Constructive feedback for the user (e.g., 'Perfect photo!', 'Too blurry', 'Multiple faces detected')." }
                    },
                    required: ["isValid", "faceCount", "isClear", "lighting", "score", "feedback"]
                }
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from Gemini");
        }
        return JSON.parse(text) as ImageAnalysisResult;

    } catch (error) {
        console.error("Error analyzing image:", error);
        // Fallback error result
        return {
            isValid: false,
            faceCount: 0,
            isClear: false,
            lighting: 'POOR',
            score: 0,
            feedback: "We couldn't verify the image quality due to a network error. Please try again."
        };
    }
};

export const generateCharacterPreview = async (
    base64Image: string,
    age: string,
    gender: string,
    stylePrompt: string = "3D Pixar-style animated movie character"
): Promise<string> => {
    const ai = getAiClient();
    const base64Data = base64Image.split(',')[1] || base64Image;

    // Detect if the user wants a realistic look
    // Expanded logic to catch more variations of "realism" from custom prompts
    const styleLower = stylePrompt.toLowerCase();
    const isRealistic = styleLower.includes('realistic') ||
        styleLower.includes('cinematic') ||
        styleLower.includes('photoreal') ||
        styleLower.includes('photography') ||
        styleLower.includes('4k');

    // Construct the prompt based on style intent
    let systemPrompt = '';

    if (isRealistic) {
        systemPrompt = `Generate a high-quality, photorealistic character portrait based on this photo.
        Target Audience: Family movie / Cinematic.
        Style: ${stylePrompt}.
        Character: A ${age} year old ${gender}.
        Action: Standing confidently.
        IMPORTANT: Maintain the facial likeness of the child in the photo but adapt lighting to be cinematic. 
        Do NOT make it a cartoon. Do NOT make it a caricature. It should look like a real photo.
        Output ONLY the generated image.`;
    } else {
        systemPrompt = `Generate an illustration of a cute cartoon character based on this photo.
        Target Audience: Kids animation.
        Style: ${stylePrompt}.
        Character: A ${age} year old ${gender}.
        Action: Standing confidently.
        IMPORTANT: Output ONLY the generated image.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Data
                        }
                    },
                    {
                        text: systemPrompt
                    }
                ]
            },
        });

        const candidate = response.candidates?.[0];

        if (!candidate) {
            throw new Error("The AI service did not return a result. Please try again.");
        }

        // Check for safety refusal
        if (candidate.finishReason === 'SAFETY') {
            throw new Error("The image could not be generated due to safety guidelines. Please try a different photo (avoid realistic close-ups of real people, try a different angle).");
        }

        // Check if content exists
        if (!candidate.content) {
            throw new Error(`Generation stopped unexpectedly (Reason: ${candidate.finishReason}).`);
        }

        // Check parts
        if (candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }

        throw new Error("No image was generated. The model might have returned text instead.");

    } catch (error: any) {
        console.error("Error generating character preview:", error);
        throw error;
    }
};