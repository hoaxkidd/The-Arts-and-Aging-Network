'use server'

import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { rateLimit } from "@/lib/rate-limit"

export async function registerGeriatricHome(formData: FormData) {
  // Rate Limiting
  const ip = (await headers()).get("x-forwarded-for") || "unknown"
  if (!rateLimit(ip, 3, 60 * 60 * 1000)) { // 3 attempts per hour
      return { error: "Too many registration attempts. Please try again later." }
  }

  const name = (formData.get("name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string

  // Home Details
  const homeName = (formData.get("homeName") as string)?.trim()
  const address = (formData.get("address") as string)?.trim()
  const residentCount = parseInt(formData.get("residentCount") as string) || 0
  const maxCapacity = parseInt(formData.get("maxCapacity") as string) || 0
  const facilityType = (formData.get("facilityType") as string)?.trim() || null
  const region = (formData.get("region") as string)?.trim() || null
  const specialNeeds = (formData.get("specialNeeds") as string)?.trim() || null
  const emergencyProtocol = (formData.get("emergencyProtocol") as string)?.trim() || null
  const triggerWarnings = (formData.get("triggerWarnings") as string)?.trim() || null
  const photoPermissions = (formData.get("photoPermissions") as string)?.trim() || null

  // Contact
  const contactName = (formData.get("contactName") as string)?.trim()
  const contactEmail = (formData.get("contactEmail") as string)?.trim()
  const contactPhone = (formData.get("contactPhone") as string)?.trim()
  const contactPosition = (formData.get("contactPosition") as string)?.trim()

  // Validation
  if (!email || !password || !homeName || !address || !contactName || !contactEmail || !contactPhone || !contactPosition) {
    return { error: "Please complete all required fields." }
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  try {
    // 1. Create User
    // Standardize to 12 rounds for stronger security
    const hashedPassword = await hash(password, 12)
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { error: "User already exists" }

    // Transaction to create User and Home
    await prisma.$transaction(async (tx) => {
      // Cast tx to any to bypass stale types if needed, though tx is inferred from prisma client
      const txClient = tx as any
      
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "HOME_ADMIN", // This role string needs to be handled in the app logic
          status: "ACTIVE",
          phone: contactPhone,
        }
      })

      // 2. Create Home Profile
      const home = await txClient.geriatricHome.create({
        data: {
          name: homeName,
          address,
          residentCount,
          maxCapacity,
          type: facilityType,
          region,
          specialNeeds,
          emergencyProtocol,
          triggerWarnings,
          photoPermissions,
          contactName,
          contactEmail,
          contactPhone,
          contactPosition,
          userId: user.id,
          latitude: 0,
          longitude: 0,
        }
      })

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
            action: 'HOME_REGISTERED',
            details: JSON.stringify({ homeId: home.id, homeName: home.name, userId: user.id }),
            userId: user.id
        }
      })
    })

  } catch (error) {
    console.error("Registration error:", error)
    // Log system failure if possible (outside tx if connection alive)
    try {
        // Sanitize error details to prevent leaking stack traces or sensitive info in logs
        const errorDetails = error instanceof Error ? { message: error.message } : { message: String(error) }
        
        await prisma.auditLog.create({
            data: {
                action: 'REGISTRATION_FAILED',
                details: JSON.stringify({ email, error: errorDetails }),
            }
        })
    } catch {} // Ignore audit failure
    return { error: "Failed to register home. Please try again or contact support." }
  }

  redirect("/login?registered=true")
}
