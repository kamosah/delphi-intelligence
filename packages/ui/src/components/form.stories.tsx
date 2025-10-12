import type { Meta, StoryObj } from '@storybook/react-vite';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from './button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './form';
import { Input } from './input';

// Form schema for demonstration
const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username must not be longer than 30 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  bio: z.string().max(160).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Demo form component
function ProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: '',
      email: '',
      bio: '',
    },
  });

  function onSubmit(data: ProfileFormValues) {
    console.log('Form submitted:', data);
    alert(JSON.stringify(data, null, 2));
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormDescription>
                We'll never share your email with anyone else.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Tell us about yourself..." {...field} />
              </FormControl>
              <FormDescription>
                Brief description for your profile. Max 160 characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}

// Login form component
const loginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

function LoginForm() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function onSubmit(data: LoginFormValues) {
    console.log('Login submitted:', data);
    alert(JSON.stringify(data, null, 2));
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </Form>
  );
}

// Storybook metadata
const meta = {
  title: 'Components/Form',
  component: Form,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Form>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A complete profile form with username, email, and bio fields.
 * Demonstrates form validation with Zod schema and error messages.
 */
export const ProfileFormExample: Story = {
  render: () => (
    <div className="w-[500px]">
      <ProfileForm />
    </div>
  ),
};

/**
 * A simple login form with email and password fields.
 * Shows minimal form setup with validation.
 */
export const LoginFormExample: Story = {
  render: () => (
    <div className="w-[400px]">
      <LoginForm />
    </div>
  ),
};

/**
 * Single form field demonstrating the basic structure.
 * Shows FormItem, FormLabel, FormControl, and FormMessage components.
 */
export const SingleField: Story = {
  render: () => {
    const form = useForm({
      defaultValues: {
        name: '',
      },
    });

    return (
      <div className="w-[400px]">
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormDescription>This is your display name.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    );
  },
};

/**
 * Form field with validation error displayed.
 * Shows how error messages appear below the input.
 */
export const WithError: Story = {
  render: () => {
    const form = useForm({
      resolver: zodResolver(
        z.object({
          email: z.string().email('Invalid email address'),
        })
      ),
      defaultValues: {
        email: 'invalid-email',
      },
    });

    // Trigger validation to show error
    form.trigger('email');

    return (
      <div className="w-[400px]">
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    );
  },
};

/**
 * Form field with description text.
 * Demonstrates FormDescription component usage.
 */
export const WithDescription: Story = {
  render: () => {
    const form = useForm({
      defaultValues: {
        apiKey: '',
      },
    });

    return (
      <div className="w-[400px]">
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input placeholder="sk_test_..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Your API key is used to authenticate requests. Keep it
                    secure and never share it publicly.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    );
  },
};

/**
 * Disabled form field.
 * Shows how disabled state appears.
 */
export const Disabled: Story = {
  render: () => {
    const form = useForm({
      defaultValues: {
        email: 'user@example.com',
      },
    });

    return (
      <div className="w-[400px]">
        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormDescription>
                    This field is disabled and cannot be edited.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    );
  },
};
