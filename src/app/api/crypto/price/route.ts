import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const coinId = searchParams.get("coinId")

  if (!coinId) {
    return NextResponse.json({ error: "coinId is required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=idr`,
      {
        headers: {
          accept: "application/json",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch price")
    }

    const data = await response.json()
    const price = data[coinId]?.idr

    if (!price) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 })
    }

    return NextResponse.json({ price, coinId })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch crypto price" },
      { status: 500 }
    )
  }
}

// Batch update multiple coin prices
export async function POST(request: NextRequest) {
  try {
    const { coinIds } = await request.json()

    if (!coinIds || !Array.isArray(coinIds) || coinIds.length === 0) {
      return NextResponse.json({ error: "coinIds array is required" }, { status: 400 })
    }

    const ids = coinIds.join(",")
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr`,
      {
        headers: {
          accept: "application/json",
        },
      }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch prices")
    }

    const data = await response.json()
    
    const prices: Record<string, number> = {}
    for (const coinId of coinIds) {
      if (data[coinId]?.idr) {
        prices[coinId] = data[coinId].idr
      }
    }

    return NextResponse.json({ prices })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch crypto prices" },
      { status: 500 }
    )
  }
}
