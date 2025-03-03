import * as handlebars from 'handlebars'
import nodemailer from 'nodemailer'
import fs from 'node:fs'
import path from 'path'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT as string, 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASSWORD = process.env.SMTP_PASSWORD
const SENDER_EMAIL = process.env.SENDER_EMAIL
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true
const TLS = process.env.ALLOW_UNAUTHORIZED_CERTS ? { rejectUnauthorized: false } : undefined

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE ?? true,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD
    },
    tls: TLS
})

const getEmailTemplate = (defaultTemplateName: string, userTemplatePath?: string) => {
    try {
        if (userTemplatePath) {
            return fs.readFileSync(userTemplatePath, 'utf8')
        }
    } catch (error) {
        console.warn(`Failed to load custom template from ${userTemplatePath}, falling back to default`)
    }
    return fs.readFileSync(path.join(__dirname, '../', 'emails', defaultTemplateName), 'utf8')
}

const sendWorkspaceInvite = async (email: string, workspaceName: string, registerLink: string) => {
    let htmlToSend
    let textContent

    const template = getEmailTemplate('workspace_invite.hbs', process.env.WORKSPACE_INVITE_TEMPLATE_PATH)
    const compiledWorkspaceInviteTemplateSource = handlebars.compile(template)
    htmlToSend = compiledWorkspaceInviteTemplateSource({ workspaceName, registerLink })
    textContent = `You have been invited to ${workspaceName}. Click here to register: ${registerLink}` // plain text body

    await transporter.sendMail({
        from: SENDER_EMAIL || '"FlowiseAI Team" <team@mail.flowiseai.com>', // sender address
        to: email,
        subject: `You have been invited to ${workspaceName}`, // Subject line
        text: textContent, // plain text body
        html: htmlToSend // html body
    })
}

const sendPasswordResetEmail = async (email: string, resetLink: string) => {
    const passwordResetTemplateSource = fs.readFileSync(path.join(__dirname, '../', 'emails', 'workspace_user_reset_password.hbs'), 'utf8')
    const compiledPasswordResetTemplateSource = handlebars.compile(passwordResetTemplateSource)

    const htmlToSend = compiledPasswordResetTemplateSource({ resetLink })
    await transporter.sendMail({
        from: SENDER_EMAIL || '"FlowiseAI Team" <team@mail.flowiseai.com>', // sender address
        to: email,
        subject: 'Reset your password', // Subject line
        text: `You requested a link to reset your password. Click here to reset the password: ${resetLink}`, // plain text body
        html: htmlToSend // html body
    })
}

export { sendWorkspaceInvite, sendPasswordResetEmail }
