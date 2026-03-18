/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your UPSC Connect password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>UPSC Connect</Text>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for UPSC Connect. Click
          the button below to choose a new password.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
        <Text style={support}>
          Need help? Contact us at{' '}
          <Link href="mailto:support@upscconnect.in" style={link}>
            support@upscconnect.in
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const brand = { fontSize: '18px', fontWeight: 'bold' as const, color: 'hsl(220, 70%, 45%)', margin: '0 0 24px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(220, 20%, 10%)', margin: '0 0 20px', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const text = { fontSize: '15px', color: 'hsl(220, 10%, 45%)', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = { backgroundColor: 'hsl(220, 70%, 45%)', color: '#ffffff', fontSize: '15px', borderRadius: '12px', padding: '12px 24px', textDecoration: 'none', fontWeight: '600' as const }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const support = { fontSize: '12px', color: '#999999', margin: '8px 0 0' }
