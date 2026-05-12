import { GoogleGenAI } from "@google/genai";
import { type TripFormData } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });

export async function createTripPlanStream(
  data: TripFormData,
  onChunk: (text: string) => void
) {
  const model = "gemini-1.5-flash";
  
  const systemPrompt = `You are a world-class luxury and budget travel planner with deep knowledge of global destinations, hidden gems, and local logistics.
Your goal is to create a highly detailed, engaging, and structured travel itinerary.

Input Details:
- Start: ${data.startLocation}
- Destination: ${data.destination}
- Duration: ${data.duration} Days
- Budget: ${data.budget} ${data.currency}
- Style: ${data.travelStyle}
- Trip Types: ${data.tripTypes.join(', ')}
- Guests: ${data.guests}
- Preferences: ${data.preferences.join(', ')}
- Extra Notes: ${data.notes || 'None'}

Output Structure (MANDATORY):
1. # Trip Overview - A captivating summary of the trip focusing on the vibe of the ${data.tripTypes.join('/')}.
   - **MANDATORY**: Start this section with a breathtaking, high-quality, wide-angle scenic image showing the beauty of the destination using Markdown: ![Destination Beauty](https://source.unsplash.com/featured/1280x720/?${data.destination.replace(/\s+/g, '')},travel,landscape).
   - ### Best Time to Visit: Provide specific seasonal recommendations for this destination.
2. # Day-wise Itinerary - Detailed plan for ${data.duration} days. Use subheadings like "## Day 1: Exploring the Heart of [City]". For each day, include:
   - **Morning**: Activity, timing, why visit.
   - **Afternoon**: Activities, lunch suggestion.
   - **Evening**: Sunset spots, dinner suggestion, nightlife.
3. # Must-Visit Places - A curated list with descriptions and best time to visit each.
   - **MANDATORY**: For each place, provide its name as a clickable link that opens its location and photos on Google Maps using Markdown: [📍 View Place Name Location & Photos](https://www.google.com/maps/search/?api=1&query=Place+Name). DO NOT include direct images.
4. # Hidden Gems - 3-4 local, off-the-beaten-path locations. For each, provide a Google Maps search link as described above. DO NOT include direct images.
5. # Accommodation - 3 categorized options (Budget, Mid-range, Luxury). 
   - **MANDATORY**: Provide a direct booking or search link for each (e.g., [Book on Booking.com](https://www.booking.com/searchresults.html?ss=HotelName)). DO NOT include images.
6. # Travel Options - How to get there from ${data.startLocation} (Flight, Train, Bus). 
   - **MANDATORY**: Provide booking search links for each (e.g., [Find Flights on Skyscanner](https://www.skyscanner.com/transport/flights/source/dest/), [Book Trains/Buses on Omio](https://www.omio.com/)). Include local transport tips. DO NOT include images.
7. # Budget Breakdown Table - Create a Markdown table with columns: Category, Estimated Cost (${data.currency}), Notes. Categories: Stay, Travel, Food, Activities, Misc. Include a Total row. If the total exceeds ${data.budget}, flag it and suggest adjustments.
8. # Money-Saving Tips - Practical, local-specific hacks.
9. # Travel Tips - Packing checklist, safety, etiquette.
10. # [INTERNAL_DATA]
<map_markers_json>
[
  { "id": "1", "name": "Name", "description": "Short desc", "lat": 0.0, "lng": 0.0, "day": 1 }
]
</map_markers_json>
[END_INTERNAL_DATA]

Style Guide:
- Use emojis for flair.
- Use bold text for emphasis.
- DO NOT use direct images in any section. Instead, use the Google Maps link format for all specific locations and visiting places.
- Keep the tone professional, helpful, and inspiring.
- Render everything in Markdown.`;

  try {
    const stream = await ai.models.generateContentStream({
      model,
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
    });

    let fullText = "";
    for await (const chunk of stream) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      onChunk(fullText);
    }
    return fullText;
  } catch (error: any) {
    console.error("Gemini stream error:", error);
    throw error;
  }
}

export async function extractTripDataFromVoice(transcript: string): Promise<any> {
  const model = "gemini-1.5-flash";
  const prompt = `Extract trip details from this voice transcript: "${transcript}". 
Return ONLY a valid JSON object with these fields: 
"startLocation" (string), 
"destination" (string), 
"budget" (number), 
"currency" (string - 3-letter code),
"duration" (number - days),
"tripTypes" (array of strings - valid: "weekend", "family", "business", "romantic", "friends", "solo", "holiday"),
"preferences" (array of strings - valid: "nature", "temples", "beaches", "food", "nightlife", "adventure", "shopping", "history", "wellness").

If a field is not found, omit it.
Example: {"startLocation": "New York", "destination": "Paris", "budget": 5000, "currency": "USD", "duration": 7, "tripTypes": ["holiday"], "preferences": ["food", "history"]}?`;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error("Extraction error:", error);
    return null;
  }
}

export async function chatWithGemini(
  messages: { role: "user" | "model"; content: string }[],
  onChunk: (text: string) => void,
  signal?: AbortSignal
) {
  const model = "gemini-1.5-flash";
  
  const systemInstruction = `You are a helpful travel assistant for the Travel Planner application. 
You can help users with travel advice, destination information, budget tips, and clarifying details about their itineraries.
Keep your responses concise, friendly, and travel-oriented. Use emojis to make the conversation engaging.
If the user asks about a specific destination or activity, provide practical and inspiring advice.
Answer promptly and don't be overly verbose.`;

  try {
    const formattedContents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const stream = await ai.models.generateContentStream({
      model,
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });

    let fullText = "";
    for await (const chunk of stream) {
      if (signal?.aborted) {
        break;
      }
      const chunkText = chunk.text || "";
      fullText += chunkText;
      onChunk(fullText);
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || signal?.aborted) {
      console.log("Chat generation aborted");
      return;
    }
    console.error("Chat Gemini error:", error);
    throw error;
  }
}

export async function getVoiceSummary(itinerary: string): Promise<string> {
  const model = "gemini-1.5-flash";
  const prompt = `Summarize this travel itinerary into a short, descriptive 2-3 sentence paragraph that is friendly and easy to read aloud by a voice assistant. Focus on the main highlights and vibe. Do not use special characters or markdown.
  
  Itinerary:
  ${itinerary}`;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    return result.text || "Your trip is ready! Check the details on your screen.";
  } catch (error) {
    console.error("Voice summary error:", error);
    return "Your trip is ready! Here is your custom itinerary.";
  }
}

export async function getAlternativeDestinations(destination: string, budget: number, currency: string): Promise<any[]> {
  const model = "gemini-1.5-flash";
  const prompt = `The user wants to go to "${destination}" with a budget of ${budget} ${currency}. 
  If this budget is realistically too low for a comfortable 5-7 day trip, suggest 3 similar destinations with a lower cost of living but a similar "vibe" (e.g., if they chose Swiss Alps, suggest Tatra Mountains or Georgia).
  If the budget is sufficient, you can still suggest unique alternatives.
  
  Return ONLY a valid JSON array of objects with: 
  "name" (string), 
  "reason" (string - why it is similar but cheaper), 
  "estimatedBudget" (number - for 5 days in ${currency}), 
  "vibeMatch" (number 1-100).`;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.text || "[]");
  } catch (error) {
    console.error("Alternative destinations error:", error);
    return [];
  }
}

export async function getMoodRecommendations(mood: string, budget: number, currency: string): Promise<any[]> {
  const model = "gemini-1.5-flash";
  const prompt = `The user is feeling "${mood}" and has a budget of ${budget} ${currency} for a 1-week trip.
  Suggest 3 diverse destinations (1 domestic-ish, 2 international) that match this mood and fit this budget.
  
  Return ONLY a JSON array of objects with:
  "name" (string),
  "description" (string - max 100 chars),
  "whyMatch" (string - why it fits the mood "${mood}"),
  "estimatedCost" (number - in ${currency}),
  "landscapeType" (string - e.g., "Lush Greenery", "Alpine Lakes", "Golden Deserts", "Coastal Cliffs"),
  "highlight" (string - one specific "wow" factor)
  `;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.text || "[]");
  } catch (error) {
    console.error("Mood recommendations error:", error);
    
    // Improved Fallback data based on general mood categories
    const fallbacks: Record<string, any[]> = {
      adventurous: [
        { name: "Rishikesh, India", description: "Yoga capital with white water rafting", whyMatch: "Perfect for action and spirit", estimatedCost: budget * 0.3, landscapeType: "Rivers & Mountains", highlight: "Bungee Jumping" },
        { name: "Interlaken, Switzerland", description: "Adventure capital of Europe", whyMatch: "Ultimate mountain thrills", estimatedCost: budget * 0.9, landscapeType: "Alpine Peaks", highlight: "Skydiving over Lakes" },
        { name: "Queentown, NZ", description: "Breathtaking landscapes and extreme sports", whyMatch: "World class adventure", estimatedCost: budget * 0.8, landscapeType: "Lakes & Glaciers", highlight: "AJ Hackett Bungy" }
      ],
      relaxed: [
        { name: "Goa, India", description: "Pristine beaches and laid back vibes", whyMatch: "Ultimate coastal relaxation", estimatedCost: budget * 0.4, landscapeType: "Tropical Coastline", highlight: "Sunset Beach Yoga" },
        { name: "Bali, Indonesia", description: "Spiritual retreats and lush rice fields", whyMatch: "Serene and peaceful", estimatedCost: budget * 0.6, landscapeType: "Jungle & Beaches", highlight: "Villas with Private Pools" },
        { name: "Santorini, Greece", description: "Iconic blue domes and calm waters", whyMatch: "Quiet luxury and views", estimatedCost: budget * 0.9, landscapeType: "Volcanic Cliffs", highlight: "Sunset over Oia" }
      ],
      romantic: [
        { name: "Udaipur, India", description: "The City of Lakes", whyMatch: "Palatial romance", estimatedCost: budget * 0.5, landscapeType: "Mirror-like Lakes", highlight: "Boat ride at Lake Pichola" },
        { name: "Paris, France", description: "The City of Love", whyMatch: "Timeless romantic atmosphere", estimatedCost: budget * 1.0, landscapeType: "Urban Elegance", highlight: "Eiffel Tower Sparkles" },
        { name: "Maldives", description: "Overwater bungalows and crystal seas", whyMatch: "Secluded intimacy", estimatedCost: budget * 1.2, landscapeType: "Atolls & Lagoons", highlight: "Underwater Dining" }
      ]
    };

    const moodLower = mood.toLowerCase();
    return fallbacks[moodLower] || fallbacks.relaxed;
  }
}

export async function getSeasonalRecommendations(userLocation: string = "India"): Promise<any> {
  const model = "gemini-1.5-flash";
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'long' });
  
  const prompt = `It is currently ${month}. Based on this season and the user's base location of "${userLocation}", provide travel recommendations in 3 categories.
  
  Categories:
  1. Nearby/In-state: Within 300 miles of ${userLocation}.
  2. National: Popular and seasonally perfect spots within the same country as ${userLocation}.
  3. Global: The best international places to visit right now (e.g. for weather, festivals, or off-season deals).

  Return ONLY a JSON object with keys "nearby", "national", "global". 
  Each key should be an array of 3 objects: { "name": string, "description": string, "highlight": string, "type": "nature" | "city" | "beach" | "culture" }.`;

  try {
    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error("Seasonal recommendations error:", error);
    
    // Robust seasonal fallback (May/Summer focus)
    return {
      nearby: [
        { name: "Munnar", description: "Cool tea plantations and mist", highlight: "Tea Museum", type: "nature" },
        { name: "Coorg", description: "Scotland of India with coffee estates", highlight: "Abbey Falls", type: "nature" },
        { name: "Hampi", description: "Ancient ruins with sunset views", highlight: "Virupaksha Temple", type: "culture" }
      ],
      national: [
        { name: "Leh Ladakh", description: "High altitude desert peaks", highlight: "Pangong Lake", type: "nature" },
        { name: "Srinagar", description: "Heaven on earth with houseboats", highlight: "Dal Lake", type: "nature" },
        { name: "Manali", description: "Gateway to the majestic Himalayas", highlight: "Rohtang Pass", type: "nature" }
      ],
      global: [
        { name: "Kyoto, Japan", description: "Zen gardens and historic shrines", highlight: "Fushimi Inari", type: "culture" },
        { name: "Amalfi Coast, Italy", description: "Colorful cliffside villages", highlight: "Positano View", type: "beach" },
        { name: "Cape Town, SA", description: "Breathtaking coast and table mountain", highlight: "Boulders Beach", type: "nature" }
      ]
    };
  }
}
