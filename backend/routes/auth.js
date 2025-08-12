const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const auth = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const { google } = require("googleapis");
const {createDefaultFolder} = require('../utils/folder');
const OAuth2Client = google.auth.OAuth2;

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret", {
		expiresIn: "7d",
	});
};

// Register
router.post("/register", async (req, res) => {
	const { firstName, lastName, email, password } = req.body;

	if (!firstName) return res.status(400).json({ message: "First name is required." });
	if (!lastName) return res.status(400).json({ message: "Last name is required." });
	if (!email) return res.status(400).json({ message: "Email is required." });
	if (!password) return res.status(400).json({ message: "Password is required." });

	try {
		const existingUser = await User.findOne({ email });
		if (existingUser)
			return res.status(400).json({ message: "User already exists" });

		const user = new User({ firstName, lastName, email, password });
		await user.save();

		const token = generateToken(user._id);

		res.cookie("token", token, {
			httpOnly: true,
			secure: true, 
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, 
		});
		await createDefaultFolder(user._id); 

		res.status(201).json({
			token,
			user: { id: user._id, email: user.email },
		});
	} catch (error) {
		res.status(500).json({ message: "Server error" });
	}
});


router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		if (!email) return res.status(400).json({ message: "Email is required." });
		if (!password) return res.status(400).json({ message: "Password is required." });

		const user = await User.findOne({ email });
		if (!user) return res.status(400).json({ message: "Invalid credentials" });
		

		const isMatch = await user.comparePassword(password);
		if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });
		

		const token = generateToken(user._id);
		res.cookie("token", token, {
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		res.json({
			token,
			user: { id: user._id, email: user.email },
		});
	} catch (error) {
		res.status(500).json({ message: "Server error" });
	}
});

// Get current user
router.get("/me", auth, async (req, res) => {
	res.json({ user: req.user });
});

//change password
router.post("/change-password", auth, async (req, res) => {
	const { oldPassword, newPassword } = req.body;

	if (!oldPassword) return res.status(400).json({ message: "Old password is required." });
	if (!newPassword) return res.status(400).json({ message: "New password is required." });

	const user = await User.findById(req.user.id);
	if (!user) return res.status(404).json({ message: "User not found" });

	const isMatch = await bcrypt.compare(oldPassword, user.password);
	if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

	const hashedPassword = await bcrypt.hash(newPassword, 10);

	await User.findByIdAndUpdate(
		req.user.id,
		{ password: hashedPassword },
		{ runValidators: false } // skips validation on other fields like firstName
	);

	res.json({ message: "Password changed successfully" });
});

// OTP generator
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Forgot Password - Send OTP
router.post("/forgot-password", async (req, res) => {
	const { email } = req.body;
	if (!email) return res.status(400).json({ message: "Email is required." });
	const user = await User.findOne({ email });

	if (!user) return res.status(404).json({ message: "User not found" });

	const otp = generateOTP();
	const hashedOtp = await bcrypt.hash(otp, 10);
	const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

	//update directly without triggering required fields validation
	await User.findByIdAndUpdate(
		user._id,
		{
			otp: hashedOtp,
			otpExpiry: otpExpiry,
			otpVerified: false,
		},
		{ runValidators: false }
	);

	//send email with plain OTP
	await sendEmail(
		email,
		"Your OTP for Password Reset",
		`Your OTP is ${otp}. It is valid for 10 minutes.`
	);

	res.json({ message: "OTP sent to your email" });
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
	const { email, otp } = req.body;

	if (!email) return res.status(400).json({ message: "Email is required." });
	if (!otp) return res.status(400).json({ message: "OTP is required." });

	const user = await User.findOne({ email });
	if (!user || !user.otp || !user.otpExpiry) return res.status(400).json({ message: "Invalid or expired OTP" });

	const isMatch = await bcrypt.compare(otp, user.otp);
	if (!isMatch || user.otpExpiry < Date.now()) return res.status(400).json({ message: "Invalid or expired OTP" });
	

	await User.findByIdAndUpdate(
		user._id,
		{
			otpVerified: true,
			otp: undefined,
			otpExpiry: undefined,
		},
		{ runValidators: false }
	);
	res.json({ message: "OTP verified. You can now reset your password." });
});

// Reset Password
router.post("/reset-password", async (req, res) => {
	const { email, newPassword } = req.body;

	if (!email) return res.status(400).json({ message: "Email is required." });
	if (!newPassword) return res.status(400).json({ message: "Password is required." });

	const user = await User.findOne({ email });

	if (!user || !user.otpVerified) return res.status(400).json({ message: "OTP not verified or user not found" });
	

	const hashedPassword = await bcrypt.hash(newPassword, 10);

	await User.findByIdAndUpdate(
		user._id,
		{
			password: hashedPassword,
			otpVerified: false,
		},
		{ runValidators: false }
	);

	res.json({ message: "Password reset successful" });
});

const oAuth2Client = new OAuth2Client(
	process.env.GOOGLE_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	process.env.GOOGLE_REDIRECT_URI
);

// STEP 1: Redirect to Google
router.get("/google", (req, res) => {
	const url = oAuth2Client.generateAuthUrl({
		access_type: "offline",
		scope: ["profile", "email"],
	});
	res.redirect(url);
});

// STEP 2: Handle Google Callback
router.get("/google/callback", async (req, res) => {
	const code = req.query.code;

	try {
		const { tokens } = await oAuth2Client.getToken(code);
		oAuth2Client.setCredentials(tokens);

		const ticket = await oAuth2Client.verifyIdToken({
			idToken: tokens.id_token,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		const { email, name, picture } = payload;

		let firstName = "";
		let lastName = "";

		if (name && typeof name === "string") {
			const nameParts = name.trim().split(/\s+/);

			if (nameParts.length === 1) {
				firstName = nameParts[0];
				lastName = "";
			} else {
				lastName = nameParts.pop();
				firstName = nameParts.join(" ");
			}
		}

		let user = await User.findOne({ email });
		if (!user) {
			user = new User({ firstName, lastName, email });
			await user.save();	
		}
		const token = generateToken(user._id);

		res.cookie("token", token, {
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});
		await createDefaultFolder(user._id); 

		if(!user.password) return res.redirect("http://localhost:3000/set-password.html");
		else return res.redirect("http://localhost:3000/dashboard");
		
	} catch (error) {
		res.status(500).json({ message: "Server error during Google OAuth" });
	}
});

module.exports = router;
