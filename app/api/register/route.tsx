// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { User } from '@/model/user';
import dbConnect from '@/utli/connectdb';


export async function POST(request: Request) {
    try {
        // Connect to MongoDB
        dbConnect()

        // Parse the request body
        const { clerkUserId, email, fullName } = await request.json();

        // Validate required fields
        if (!clerkUserId || !email || !fullName) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check for existing user
        let user = await User.findOne({ clerkUserId });

        // Create new user if not exists
        if (!user) {
            user = await User.create({ clerkUserId, email, fullName });
        }

        return NextResponse.json({
            mongoUserId: user._id,
            message: "User registered successfully"
        }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// Optional: Add TypeScript interface for the user
interface UserData {
    clerkUserId: string;
    email: string;
    fullName: string;
}