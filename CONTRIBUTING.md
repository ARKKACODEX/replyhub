# Contributing to ReplyHub

Thank you for your interest in contributing to ReplyHub! This document provides guidelines and best practices for developing this project.

## 🏗️ Architecture Principles

### 1. Type Safety
- **Always use TypeScript** - No `any` types unless absolutely necessary
- **Validate all inputs** - Use Zod schemas for API requests
- **Type database queries** - Leverage Prisma's type generation

### 2. Error Handling
- **Never throw raw errors** - Use custom error classes from `lib/api-error.ts`
- **Always use error handler** - Wrap API routes with `handleAPIError()`
- **Provide context** - Include helpful error messages for debugging

### 3. Performance
- **Use Edge Runtime** - Add `export const runtime = 'edge'` to API routes
- **Optimize database queries** - Use indexes, select only needed fields
- **Implement caching** - Cache expensive operations
- **Code splitting** - Use dynamic imports for heavy components

### 4. Security
- **Validate everything** - Never trust user input
- **Use Row-Level Security** - Filter by accountId in all queries
- **Rate limiting** - Implement rate limits on all public endpoints
- **Environment variables** - Never expose secrets to client

## 📁 File Organization

### API Routes (`app/api/`)
```typescript
// Good structure
app/api/
├── [resource]/
│   ├── route.ts           // Main CRUD operations
│   ├── [id]/
│   │   └── route.ts       // Operations on specific resource
│   └── [action]/
│       └── route.ts       // Special actions (e.g., /contacts/import)
```

### Components (`components/`)
```typescript
// Good structure
components/
├── ui/                    // Reusable UI primitives
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
├── [feature]/             // Feature-specific components
│   ├── feature-list.tsx
│   ├── feature-item.tsx
│   └── feature-form.tsx
```

## 🎯 Code Style

### TypeScript

```typescript
// ✅ Good
interface ContactFormData {
  firstName: string
  lastName?: string
  email: string
  phone: string
}

async function createContact(data: ContactFormData): Promise<Contact> {
  const contact = await prisma.contact.create({ data })
  return contact
}

// ❌ Bad
async function createContact(data: any) {
  return await prisma.contact.create({ data })
}
```

### API Routes

```typescript
// ✅ Good
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { handleAPIError } from '@/lib/error-handler'

const schema = z.object({
  name: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    // ... business logic
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleAPIError(error)
  }
}

// ❌ Bad
export async function POST(request) {
  const body = await request.json()
  // No validation, no error handling
  return NextResponse.json({ data: body })
}
```

### React Components

```typescript
// ✅ Good
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn('btn', `btn-${variant}`)}>
      {children}
    </button>
  )
}

// ❌ Bad
export function Button(props) {
  return <button {...props}>{props.children}</button>
}
```

## 🧪 Testing Guidelines

### Manual Testing
Before committing, test:
1. **Happy path** - Normal usage works
2. **Edge cases** - Empty inputs, max lengths, special characters
3. **Error cases** - Invalid inputs show proper errors
4. **Mobile** - Works on small screens
5. **Performance** - No loading delays

### API Testing with curl

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test with auth header
curl http://localhost:3000/api/example \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'
```

## 🔄 Git Workflow

### Branch Naming
```bash
# Feature branches
git checkout -b feature/add-twilio-integration

# Bug fixes
git checkout -b fix/call-recording-issue

# Documentation
git checkout -b docs/update-setup-guide
```

### Commit Messages

```bash
# ✅ Good
git commit -m "feat: Add Twilio call recording integration"
git commit -m "fix: Resolve appointment booking timezone issue"
git commit -m "docs: Update README with Stripe setup instructions"

# ❌ Bad
git commit -m "updates"
git commit -m "fix bug"
git commit -m "WIP"
```

### Commit Format
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding tests
- `chore`: Maintenance tasks

## 📦 Adding Dependencies

Before adding a new dependency:
1. **Check if necessary** - Can you solve it with existing tools?
2. **Check bundle size** - Use [bundlephobia.com](https://bundlephobia.com)
3. **Check maintenance** - Is it actively maintained?
4. **Check TypeScript support** - Does it have type definitions?

```bash
# Install production dependency
npm install package-name

# Install dev dependency
npm install -D package-name
```

## 🔐 Environment Variables

### Adding New Variables

1. **Add to `.env.example`** with placeholder
2. **Document in README** with description
3. **Validate in code** - Check if required variables are set

```typescript
// lib/env.ts
if (!process.env.REQUIRED_VAR) {
  throw new Error('Missing REQUIRED_VAR environment variable')
}
```

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Environment variables set in Vercel
- [ ] Database migrations applied
- [ ] Webhooks configured
- [ ] Error monitoring active
- [ ] Performance tested (Lighthouse score > 90)

## 🐛 Debugging

### Common Issues

**Prisma Client Not Generated:**
```bash
npm run db:generate
```

**Database Connection Error:**
- Check DATABASE_URL in `.env`
- Verify database is running
- Check network connectivity

**Clerk Authentication Issues:**
- Verify API keys are correct
- Check webhook is configured
- Ensure middleware is in place

**Build Errors:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 💡 Best Practices

### Database Queries

```typescript
// ✅ Good - Use transactions for multiple operations
await prisma.$transaction(async (tx) => {
  const contact = await tx.contact.create({ data: contactData })
  await tx.activity.create({ data: { contactId: contact.id, ... } })
})

// ❌ Bad - Separate queries (not atomic)
const contact = await prisma.contact.create({ data: contactData })
await prisma.activity.create({ data: { contactId: contact.id, ... } })
```

### API Response Format

```typescript
// ✅ Good - Consistent structure
return NextResponse.json({
  success: true,
  data: { ... },
  meta: { page: 1, total: 100 }
})

// Error response (handled by error handler)
{
  error: {
    message: "User-friendly message",
    code: "ERROR_CODE",
    details: { ... }
  }
}
```

### React Hooks

```typescript
// ✅ Good - Custom hooks for reusable logic
function useContact(contactId: string) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContact(contactId).then(setContact).finally(() => setLoading(false))
  }, [contactId])

  return { contact, loading }
}

// Usage
const { contact, loading } = useContact('123')
```

## 📚 Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Clerk Docs:** https://clerk.com/docs
- **Stripe Docs:** https://stripe.com/docs
- **Twilio Docs:** https://www.twilio.com/docs

## 🤝 Getting Help

If you're stuck:
1. Check the documentation
2. Search existing issues
3. Ask in team chat
4. Create a detailed issue with:
   - What you're trying to do
   - What you've tried
   - Error messages
   - Environment details

---

**Remember:** Write code that you'd want to maintain in 6 months!
