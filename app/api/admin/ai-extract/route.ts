import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isAdminUser } from '@/lib/accessControl';

function formatDescriptionPoints(desc?: string | null): string {
  if (!desc) return '';
  let res = String(desc).replace(/\r\n/g, '\n');
  res = res.replace(/(?:^|\n|[ \t]+)[•●▪][ \t]*/g, '\n• ');
  res = res.replace(/(?:^|\n)[ \t]*[\-\*][ \t]+/g, '\n• ');
  res = res.replace(/\n{3,}/g, '\n\n');
  return res.replace(/^\n+/, '').trim();
}

export const runtime = 'nodejs';

interface ExtractedListing {
  title: string;
  category: 'rent' | 'pg' | 'buy' | 'commercial';
  type: 'flat' | 'house' | 'pg' | 'commercial';
  city: string;
  locality: string;
  address: string;
  price: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  areaSqFt?: number | null;
  furnishing: 'fully-furnished' | 'semi-furnished' | 'unfurnished';
  amenities: string[];
  description: string;
  ownerName: string;
  ownerPhone: string;
  ownerRole: 'owner' | 'agent';
}

function cleanListingTitle(rawTitle: string, locality?: string, city?: string): string {
  let clean = (rawTitle || '').trim();
  if (locality && locality.length > 2) {
    const escapedLoc = locality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clean = clean.replace(new RegExp(`\\s*(?:in|at|near|,)\\s*${escapedLoc}.*`, 'i'), '');
  }
  if (city && city.length > 2) {
    const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    clean = clean.replace(new RegExp(`\\s*(?:in|at|near|,)\\s*${escapedCity}.*`, 'i'), '');
  }
  clean = clean.replace(/\s*(?:in|at|near|,)\s*(?:Sector\s*\d+[a-zA-Z]?|Chandigarh|Mohali|Kharar|Zirakpur|Panchkula).*$/i, '');
  clean = clean.replace(/[,–\-\s]+$/, '').trim();
  return clean || 'Comfortable Property Listing';
}

function stripConfidentialAddressDetails(text: string): string {
  if (!text) return '';
  let cleaned = text;
  // 1. Gali / Street / Lane with number (e.g. "Gali no.1", "Gali no 1", "Street no. 2", "Lane 3")
  cleaned = cleaned.replace(/\b(?:gali|street|lane)\s*(?:no\.?|number|#)?\s*[0-9]+[a-zA-Z]?\b[,\s]*/gi, '');
  // 2. Road with number (e.g. "Road no. 5" or "Road #2", keeping "Airport Road" intact)
  cleaned = cleaned.replace(/\broad\s*(?:no\.?|number|#)\s*[0-9]+[a-zA-Z]?\b[,\s]*/gi, '');
  // 3. House / Flat / Plot / Kothi / Villa / Shop / Booth / Cabin with number (e.g. "H.No. 4031", "House no 12", "Flat 204")
  cleaned = cleaned.replace(/\b(?:house|h\.?no\.?|h-no|flat|plot|kothi|villa|shop|booth|cabin)\s*(?:no\.?|number|#)?\s*[0-9]+[a-zA-Z\-/]*\b[,\s]*/gi, '');
  // 4. Room no. X (preserve general "1 room" or "room without kitchen", only remove "room no. 101" etc.)
  cleaned = cleaned.replace(/\broom\s*(?:no\.?|number|#)\s*[0-9]+[a-zA-Z\-/]*\b[,\s]*/gi, '');
  // 5. Leading or standalone house numbers like '4031, sector 68' or '#4031, sector 68'
  cleaned = cleaned.replace(/^#?\s*[0-9]{1,5}[a-zA-Z]?\s*,\s*/i, '');
  cleaned = cleaned.replace(/(?:^|\s)#\s*[0-9]{1,5}[a-zA-Z]?(?:\s*,\s*|\s+)/gi, ' ');
  // 6. Cleanup commas and horizontal whitespace (PRESERVE NEWLINES FOR BULLET POINTS)
  cleaned = cleaned.replace(/,\s*,+/g, ',');
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  cleaned = cleaned.replace(/^[\s,–\-]+/, '').replace(/[\s,–\-]+$/, '').trim();
  return cleaned;
}

function extractVerifiedAreaSqFt(rawText: string, aiVal?: any): number | null {
  if (!rawText) return null;
  const unitMatch = rawText.match(/(\d{2,5})\s*(?:sq\s*ft|sqft|sq\.ft|square\s*feet|sq\s*meter|sqm|gaj|yards)/i);
  const keywordMatch = rawText.match(/(?:area|carpet\s*area|super\s*area|size)\s*[:\-]?\s*(\d{2,5})/i);
  if (unitMatch) {
    const num = parseInt(unitMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  if (keywordMatch) {
    const num = parseInt(keywordMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }
  // If raw text never explicitly mentioned area, reject hallucinated numbers (return null)
  return null;
}

const VALID_CITIES = ['Chandigarh', 'Mohali', 'Kharar', 'Zirakpur', 'Panchkula'] as const;
type ValidCity = (typeof VALID_CITIES)[number];

function normalizeCity(rawCity?: string, rawLocality?: string, rawText?: string): ValidCity {
  const combined = `${rawCity || ''} ${rawLocality || ''} ${rawText || ''}`.toLowerCase();
  if (combined.includes('kharar') || combined.includes('sunny enclave') || combined.includes('chajju majra') || combined.includes('gillco') || combined.includes('landran') || /sector\s*12[0-7]\b/i.test(combined)) {
    return 'Kharar';
  }
  if (combined.includes('zirakpur') || combined.includes('vip road') || combined.includes('dhakoli') || combined.includes('peer muchalla') || combined.includes('baltana') || combined.includes('gazipur')) {
    return 'Zirakpur';
  }
  if (combined.includes('panchkula') || combined.includes('mdc') || combined.includes('mansa devi') || combined.includes('pinjore') || combined.includes('kalka')) {
    return 'Panchkula';
  }
  if (combined.includes('mohali') || combined.includes('sas nagar') || combined.includes('phase ') || combined.includes('aerocity') || combined.includes('it city') || /sector\s*(?:6[6-9]|[7-9]\d|1[01]\d)\b/i.test(combined)) {
    return 'Mohali';
  }
  if (combined.includes('nayagaon') || combined.includes('kansal') || combined.includes('chandigarh') || combined.includes('dhanas') || combined.includes('manimajra') || /sector\s*(?:[1-9]|[1-5]\d|6[0-3])\b/i.test(combined)) {
    return 'Chandigarh';
  }
  const matched = VALID_CITIES.find(c => c.toLowerCase() === (rawCity || '').toLowerCase().trim());
  return matched || 'Chandigarh';
}

function ensureCityInAddress(addr: string, city: string): string {
  if (!addr) return city;
  const trimmed = addr.trim();
  const lowerAddr = trimmed.toLowerCase();
  const lowerCity = city.toLowerCase();
  if (new RegExp('\\b' + lowerCity + '\\b', 'i').test(lowerAddr)) {
    return trimmed;
  }
  return `${trimmed.replace(/[,–\-\s]+$/, '')}, ${city}`;
}

function parseStrictNumber(val: any, fallback = 0): number {
  if (typeof val === 'number' && !isNaN(val)) return Math.round(val);
  if (!val) return fallback;
  const str = String(val).toLowerCase().trim().replace(/,/g, '');
  if (str.includes('k')) {
    const num = parseFloat(str.replace('k', ''));
    if (!isNaN(num)) return Math.round(num * 1000);
  }
  const cleanNum = parseInt(str.replace(/[^0-9]/g, ''), 10);
  return isNaN(cleanNum) ? fallback : cleanNum;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || !isAdminUser(authUser)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin privileges required.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawText = body.rawText?.trim();

    if (!rawText) {
      return NextResponse.json(
        { success: false, message: 'Please provide raw listing text notes to extract.' },
        { status: 400 }
      );
    }

    const geminiApiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_AI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            'GEMINI_API_KEY is not configured in environment variables (.env.local). Please set your Google Gemini API key to enable AI extraction.',
          missingKey: true
        },
        { status: 500 }
      );
    }

    const systemPrompt = `You are a Senior Real Estate AI Specialist for 'Propzy Tricity' operating in Chandigarh, Mohali, Kharar, Zirakpur, and Panchkula (Punjab/Haryana, India).
Your job is to parse raw, messy property listing notes into a strict, structured JSON object.

CRITICAL EXTRACTION RULES:
1. TITLE:
   - NEVER INCLUDE ADDRESS, LOCALITY, SECTOR, OR CITY IN THE TITLE!
   - Write a clean, appealing title highlighting property specifications and furnishing ONLY (e.g. 'Fully Furnished 1 Room Available', 'Spacious 2 BHK Apartment with Balcony', 'Cozy 1 RK Studio Room', 'Modern 3 BHK Luxury Flat').
   - NEVER write '... in Sector 45, Chandigarh', '... in Mohali', '... at Kharar', or any location in the title. Location details belong exclusively in the locality, city, and address fields!

2. PRICE:
   - MUST BE A PURE INTEGER NUMBER ONLY (e.g., 15000, 25000, 10500, 9000).
   - Convert '15k' -> 15000, '25k' -> 25000, '12k' -> 12000.
   - If a range is provided (e.g. '10500 to 12k'), take the minimum base rent as a pure integer (10500).
   - NEVER output strings, symbols, commas, or 'k' notation in the price field.

2. SECURITY DEPOSIT:
   - MUST BE A PURE INTEGER NUMBER ONLY (e.g., 15000, 0, 4500).
   - If 'Security charge: 15k to be negotiable' -> deposit is 15000. Do NOT put 'negotiable' in the deposit field!
   - If 'Security: No charges', 'Nil', 'Zero' -> deposit is 0.
   - If 'Security: Half' -> deposit is 50% of the price (e.g. 9000 -> 4500).
   - NEVER output words or conditions in the deposit field.

3. MULTI-UNIT NOTES:
   - Always create ONE primary listing. If a note mentions '1Bhk and 2Bhk', choose the primary base unit (1 BHK at 15000, bedrooms: 1).
   - Mention the 2BHK option details clearly in the DESCRIPTION.

4. DESCRIPTION (Rich and Comprehensive Catch-All - EVERY POINT ON A SEPARATE LINE):
   - CRITICAL: EVERY SINGLE BULLET POINT MUST BE ON ITS OWN SEPARATE LINE USING A REAL NEWLINE (\\n).
   - Start each point with '• ' (bullet followed by a space).
   - NEVER lump or combine bullet points together on the same line with spaces!
   - Example format:
     "• Cozy 1 Room without kitchen available for rent.\\n• Fully furnished with essential amenities.\\n• Ideal for student girls and boys.\\n• Security deposit: ₹7,000.\\n• Located in Sector 43, Chandigarh."
   - Place ALL special business terms here:
     * Mention secondary units (e.g. '• 2 BHK option also available in the same building at ₹25,000/month.')
     * Mention security conditions (e.g. '• Security deposit: ₹15,000 (negotiable)')
     * Mention power/AC sub-meter policies (e.g. '• AC electricity bill as per sub-meter @ ₹10/unit')
     * Mention tenant suitability (e.g. '• Suitable for: Girls, Boys, Couples and small families')
     * Mention inclusions (e.g. '• Inclusions: 5G Wi-Fi, Water, Inverter power backup')

5. ADDRESS & LOCATION PRIVACY (CRITICAL - STRICT 5 CITIES ONLY & NO HOUSE/GALI NUMBERS):
   - CITIES MUST BE STRICTLY ONE OF THESE 5 ONLY:
     1. 'Chandigarh' (covers Sectors 1-63, Nayagaon, Kansal, Dhanas, Manimajra, Maloya, Burail)
     2. 'Mohali' (covers Sectors 66-115, Phase 1-11, Sohana, Kumbra, Mattaur, Aerocity, IT City)
     3. 'Kharar' (covers Sectors 116-127, Sunny Enclave, Chajju Majra, Gillco Valley, Landran, Shivalik City)
     4. 'Zirakpur' (covers VIP Road, Dhakoli, Peer Muchalla, Baltana, Gazipur, Nagla)
     5. 'Panchkula' (covers Sectors 1-32, MDC, Mansa Devi, Pinjore)
   - CRITICAL: Nayagaon, Kansal, Dhakoli, VIP Road, Sunny Enclave, etc. are LOCALITIES, NOT CITIES!
     * Example: If note says 'Nirankari Bhawan Road, Nayagaon', locality is 'Nayagaon', city is 'Chandigarh', and full address MUST BE 'Nirankari Bhawan Road, Nayagaon, Chandigarh'.
   - FULL ADDRESS: Full address MUST ALWAYS end with the valid city name (e.g. 'Nirankari Bhawan Road, Nayagaon, Chandigarh', 'Sector 45, Chandigarh', 'Sector 68, near CP-67, Mohali')!
   - NEVER INCLUDE HOUSE NUMBERS, FLAT NUMBERS, PLOT NUMBERS, GALI NUMBERS, OR STREET NUMBERS ANYWHERE (neither in the address, nor in description, nor in title)!
   - If raw text says 'Gali no.1, Sector 45, Chandigarh' -> address MUST BE 'Sector 45, Chandigarh'.
   - If raw text says '4031, sector 68, near CP-67, mohali' -> address MUST BE 'Sector 68, near CP-67, Mohali'.
   - In description, NEVER mention house number, flat number, or gali number!

6. CATEGORY & TYPE:
   - Category: 'pg' if sharing/beds/food mentioned; otherwise 'rent', 'buy', or 'commercial'.
   - Type: 'flat', 'house', 'pg', or 'commercial'. (NEVER use 'plot').

7. AMENITIES:
   - Extract ALL furniture, electronics, and amenities mentioned (e.g. ['Bed', 'Box Bed', 'Sofa Set', 'AC', 'Almirah', '5G WiFi', 'Fridge', 'Inverter Backup', 'RO Water Purifier', 'Geyser', 'Desert Cooler', 'Washing Machine', 'TV', 'Wardrobe', 'Dining Table', 'Food Included']).
   - CRITICAL: Always use 'AC' (do NOT output 'Air Conditioner').
   - If 'Sofa', 'Sofa Set', or 'Couch' is mentioned anywhere in the note, ALWAYS include 'Sofa Set' in the amenities list!

8. CONTACT:
   - ownerPhone: clean 10-digit number.
   - ownerName: extracted name or default 'Property Owner'.
   - ownerRole: 'owner' or 'agent'.

9. BEDROOMS (BHK):
   - If PG, hostel, or sharing beds/room: set bedrooms: 0.
   - If 1 RK (Room Kitchen) or Studio: set bedrooms: 0.5.
   - For 1 BHK, 2 BHK, 3 BHK, 4 BHK: set bedrooms to 1, 2, 3, 4 respectively.

10. CARPET AREA / SQFT (CRITICAL - DO NOT GUESS):
   - ONLY extract areaSqFt if the raw text EXPLICITLY mentions square footage or area (e.g., '900 sqft', '1200 sq ft', '500 gaj').
   - If the note DOES NOT explicitly mention square feet or area, set areaSqFt to null!
   - NEVER GUESS, INVENT, OR ESTIMATE AREA NUMBERS (such as 250, 500, etc.)! If absent, output null.`;

    const userPrompt = `Parse this raw property listing note into the required JSON schema:\n\n"""\n${rawText}\n"""`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`;

    const geminiPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            category: { type: 'STRING', enum: ['rent', 'pg', 'buy', 'commercial'] },
            type: { type: 'STRING', enum: ['flat', 'house', 'pg', 'commercial'] },
            city: { type: 'STRING', enum: ['Chandigarh', 'Mohali', 'Kharar', 'Zirakpur', 'Panchkula'] },
            locality: { type: 'STRING' },
            address: { type: 'STRING' },
            price: { type: 'INTEGER' },
            deposit: { type: 'INTEGER' },
            bedrooms: { type: 'NUMBER' },
            bathrooms: { type: 'INTEGER' },
            areaSqFt: { type: 'INTEGER', nullable: true },
            furnishing: { type: 'STRING', enum: ['fully-furnished', 'semi-furnished', 'unfurnished'] },
            amenities: {
              type: 'ARRAY',
              items: { type: 'STRING' }
            },
            description: { type: 'STRING' },
            ownerName: { type: 'STRING' },
            ownerPhone: { type: 'STRING' },
            ownerRole: { type: 'STRING', enum: ['owner', 'agent'] }
          },
          required: [
            'title',
            'category',
            'type',
            'city',
            'locality',
            'address',
            'price',
            'deposit',
            'bedrooms',
            'furnishing',
            'amenities',
            'description',
            'ownerName',
            'ownerPhone'
          ]
        }
      }
    };

    const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
    let rawCandidateText = '';
    let lastErrorMsg = '';

    for (const modelName of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey
          },
          body: JSON.stringify(geminiPayload)
        });

        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          rawCandidateText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawCandidateText) break;
        } else {
          const errData = await geminiRes.json().catch(() => ({}));
          lastErrorMsg = errData?.error?.message || `Failed on ${modelName}`;
          console.warn(`[Gemini API ${modelName} warning]:`, lastErrorMsg);
        }
      } catch (err: any) {
        lastErrorMsg = err.message || 'Request failed';
      }
    }

    if (!rawCandidateText) {
      return NextResponse.json(
        { success: false, message: lastErrorMsg || 'AI failed to analyze listing notes. Please try again.' },
        { status: 502 }
      );
    }

    const parsed: ExtractedListing = JSON.parse(rawCandidateText);

    // Final strict sanitization
    const cleanedLocality = stripConfidentialAddressDetails(parsed.locality?.trim() || 'Sector 70') || 'Sector 70';
    const cleanedCity = normalizeCity(parsed.city, cleanedLocality, rawText);
    const cleanedAddress = ensureCityInAddress(
      stripConfidentialAddressDetails(
        parsed.address?.trim() || `${cleanedLocality}, ${cleanedCity}`
      ) || `${cleanedLocality}, ${cleanedCity}`,
      cleanedCity
    );
    const cleanedDescription = formatDescriptionPoints(
      stripConfidentialAddressDetails(
        parsed.description?.trim() || `Property listing in ${cleanedLocality}, ${cleanedCity}.`
      )
    );

    const sanitized: ExtractedListing = {
      title: cleanListingTitle(
        parsed.title?.trim() || 'Cozy Listing in Tricity',
        cleanedLocality,
        cleanedCity
      ),
      category: ['rent', 'pg', 'buy', 'commercial'].includes(parsed.category) ? parsed.category : 'rent',
      type: ['flat', 'house', 'pg', 'commercial'].includes(parsed.type) ? parsed.type : 'flat',
      city: cleanedCity,
      locality: cleanedLocality,
      address: cleanedAddress,
      price: parseStrictNumber(parsed.price, 10000),
      deposit: parseStrictNumber(parsed.deposit, 0),
      bedrooms: parsed.category === 'pg' || parsed.type === 'pg' || Number(parsed.bedrooms) === 0
        ? 0
        : Number(parsed.bedrooms) === 0.5
          ? 0.5
          : Math.max(0.5, parseStrictNumber(parsed.bedrooms, 1)),
      bathrooms: Math.max(1, parseStrictNumber(parsed.bathrooms, 1)),
      areaSqFt: extractVerifiedAreaSqFt(rawText, parsed.areaSqFt),
      furnishing: ['fully-furnished', 'semi-furnished', 'unfurnished'].includes(parsed.furnishing)
        ? parsed.furnishing
        : 'fully-furnished',
      amenities: (() => {
        const normalizeItem = (name: string): string => {
          const trimmed = String(name).trim();
          if (/^(air\s*conditioner|air\s*conditioning|a\/c)$/i.test(trimmed)) {
            return 'AC';
          }
          return trimmed;
        };

        const base = (Array.isArray(parsed.amenities) && parsed.amenities.length > 0
          ? parsed.amenities.map(normalizeItem).filter(Boolean)
          : ['Bed', 'AC', 'Almirah']).map(normalizeItem);

        const fullTxt = `${rawText} ${parsed.description || ''}`.toLowerCase();
        if ((fullTxt.includes('sofa') || fullTxt.includes('couch')) && !base.some(a => a.toLowerCase().includes('sofa'))) {
          base.push('Sofa Set');
        }
        if (fullTxt.includes('tv') && !base.some(a => a.toLowerCase() === 'tv')) {
          base.push('TV');
        }
        if (/\b(ac|air\s*conditioner|air\s*conditioning)\b/i.test(fullTxt) && !base.includes('AC')) {
          base.push('AC');
        }
        return Array.from(new Set(base.map(normalizeItem)));
      })(),
      description: cleanedDescription,
      ownerName: parsed.ownerName?.trim() || 'Property Owner',
      ownerPhone: parsed.ownerPhone?.trim().replace(/[^0-9]/g, '').slice(-10) || '',
      ownerRole: parsed.ownerRole === 'agent' ? 'agent' : 'owner'
    };

    return NextResponse.json({
      success: true,
      data: sanitized,
      message: 'Listing successfully analyzed by Gemini AI!'
    });
  } catch (error: any) {
    console.error('[AI Extract Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'An unexpected error occurred during extraction.'
      },
      { status: 500 }
    );
  }
}
