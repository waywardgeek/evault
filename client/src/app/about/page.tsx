'use client';

import Link from 'next/link'
import { Shield, Globe, Zap, Users, Mail, Github, ExternalLink, Monitor, Code } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            About eVaultApp
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A secure personal data vault built on distributed trust cryptography 
            that keeps your data safe even if your phone is stolen.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* The Problem */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">The Problem We're Solving</h2>
          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-8">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800 mb-2">
                  Your Data Isn't As Safe As You Think
                </h3>
                <div className="text-red-700 space-y-2">
                  <p>• Centralized systems can be compromised by hackers or bad actors</p>
                  <p>• Your phone can be stolen, lost, or broken at any time</p>
                  <p>• Users have no way to know if their "secure" systems have been compromised</p>
                  <p>• Traditional systems have single points of failure</p>
                </div>
              </div>
            </div>
          </div>
                      <p className="text-lg text-gray-600 text-center">
              Ever lost access to Gmail, GitHub, or your bank because you couldn't find your recovery codes? 
              You need somewhere secure to store them, but existing solutions can fail when you need them most.
            </p>
        </section>

        {/* Our Solution */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Solution: OpenADP + eVaultApp</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-blue-50 rounded-2xl p-8">
              <Shield className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Distributed Trust</h3>
              <p className="text-gray-600">
                Your data is protected across multiple secure servers worldwide. No single point of failure 
                can compromise your secrets - hackers would need to breach multiple independent systems.
              </p>
            </div>
            <div className="bg-green-50 rounded-2xl p-8">
              <Zap className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Frictionless Security</h3>
              <p className="text-gray-600">
                Add recovery codes instantly without entering your PIN. Only need your PIN when you 
                actually want to view them - perfect for those "oh no, I'm locked out" moments.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="bg-gray-50 rounded-2xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Register Your PIN</h3>
                <p className="text-gray-600">
                  Your simple PIN gets transformed into a cryptographically strong key 
                  distributed across multiple OpenADP servers worldwide.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Store Recovery Codes</h3>
                <p className="text-gray-600">
                  Instantly save GitHub, Gmail, banking recovery codes without entering your PIN. 
                  They're encrypted with your distributed key.
                </p>
              </div>
              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-orange-600">3</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Recover When Needed</h3>
                <p className="text-gray-600">
                  Enter your PIN to decrypt and view your recovery codes. The distributed 
                  network ensures only you can access them.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Built on OpenADP</h2>
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8">
            <div className="flex items-start space-x-4 mb-6">
              <Globe className="h-8 w-8 text-purple-600 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Open Source Advanced Data Protection</h3>
                <p className="text-gray-600 mb-4">
                  OpenADP is an open source project that provides distributed threshold cryptography 
                  for everyone. Unlike proprietary systems, you can verify the code and know exactly 
                  how your data is protected.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">Protects even when devices are stolen</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">Transparent</span>
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">Distributed Trust</span>
                </div>
              </div>
            </div>
            <p className="text-gray-600">
              eVaultApp is one of the first practical applications showing how OpenADP can protect 
              personal data in the real world. It's a working example of what's possible when we 
              move beyond single points of failure.
            </p>
          </div>
        </section>

        {/* Get Involved */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Get Involved</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <Users className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Join the OpenADP Project</h3>
              <p className="text-gray-600 mb-4">
                The OpenADP project is recruiting! We need developers, server operators, 
                and privacy advocates to help build a secure, distributed future.
              </p>
              <a 
                href="https://github.com/OpenADP/openadp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <Github className="h-4 w-4 mr-2" />
                View on GitHub
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <Mail className="h-8 w-8 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Contact & Support</h3>
              <div className="space-y-3 text-gray-600">
                <p><strong>Questions, feedback, or security issues:</strong></p>
                <p className="text-lg font-medium text-gray-900">waywardgeek@gmail.com</p>
                <p className="text-sm">Built by an independent developer passionate about privacy and security.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Tools */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Developer & Debug Tools</h2>
          <div className="bg-gray-900 rounded-2xl p-8 text-white">
            <div className="flex items-center mb-6">
              <Code className="h-8 w-8 text-green-400 mr-3" />
              <h3 className="text-xl font-semibold">Internal Tools</h3>
            </div>
            <div className="max-w-md mx-auto">
              <Link 
                href="/dashboard" 
                className="bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg p-6 block"
              >
                <div className="flex items-center mb-2">
                  <Monitor className="h-5 w-5 text-blue-400 mr-2" />
                  <span className="font-medium">Developer Dashboard</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Authentication status, API connection, user statistics, and system debugging information
                </p>
              </Link>
            </div>
            <p className="text-gray-400 text-sm mt-4">
              These tools are for developers and debugging. Regular users should use the main vault interface.
            </p>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-xl mb-8 max-w-4xl mx-auto leading-relaxed">
              We believe privacy is a fundamental human right. eVaultApp demonstrates how distributed 
              cryptography can protect your most sensitive data from loss and theft, while maintaining 
              the usability you expect from modern applications.
            </p>
            <p className="text-lg opacity-90">
              Built with OpenADP • Secured by distributed trust • Protected from device theft
            </p>
          </div>
        </section>
      </div>
    </div>
  );
} 
