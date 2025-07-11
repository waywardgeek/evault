import { NextResponse } from 'next/server'

export async function GET() {
  const content = {
    "applinks": {
      "apps": [],
      "details": [
        {
          "appID": "B2SUY7SU9A.com.evaultapp.web",
          "paths": ["*"]
        }
      ]
    },
    "webcredentials": {
      "apps": ["B2SUY7SU9A.com.evaultapp.web"]
    }
  }

  return NextResponse.json(content, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}

// Ensure this route is accessible without authentication
export const runtime = 'edge' 