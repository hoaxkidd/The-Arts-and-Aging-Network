'use server'

import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { rateLimit } from "@/lib/rate-limit"
import { createUserWithGeneratedCode } from "@/lib/user-code"
import { logger } from "@/lib/logger"
import { normalizePhone } from "@/lib/phone"
import { normalizeMultilineText, normalizeText } from "@/lib/input-normalize"

export async function registerGeriatricHome(formData: FormData) {
  // Rate Limiting
  const ip = (await headers()).get("x-forwarded-for") || "unknown"
  if (!rateLimit(ip, 3, 60 * 60 * 1000)) { // 3 attempts per hour
      return { error: "Too many registration attempts. Please try again later." }
  }

  const name = normalizeText(formData.get("name"))
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string

  // Home Details
  const homeName = normalizeText(formData.get("homeName"))
  const address = normalizeText(formData.get("address"))
  const residentCount = parseInt(formData.get("residentCount") as string) || 0
  const maxCapacity = parseInt(formData.get("maxCapacity") as string) || 0
  const facilityType = normalizeText(formData.get("facilityType")) || null
  const region = normalizeText(formData.get("region")) || null
  const specialNeeds = normalizeMultilineText(formData.get("specialNeeds")) || null
  const emergencyProtocol = normalizeMultilineText(formData.get("emergencyProtocol")) || null
  const triggerWarnings = normalizeMultilineText(formData.get("triggerWarnings")) || null
  const photoPermissions = normalizeText(formData.get("photoPermissions")) || null

  // Contact
  const contactName = normalizeText(formData.get("contactName"))
  const contactEmail = normalizeText(formData.get("contactEmail"))
  const contactPhone = normalizePhone(formData.get("contactPhone"))
  const contactPosition = normalizeText(formData.get("contactPosition"))

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
      const user = await createUserWithGeneratedCode(tx, {
        name,
        email,
        password: hashedPassword,
        role: "HOME_ADMIN",
        status: "ACTIVE",
        phone: contactPhone,
      })

      // 2. Create Home Profile
      const home = await tx.geriatricHome.create({
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
    logger.serverAction("Registration error:", error)
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
