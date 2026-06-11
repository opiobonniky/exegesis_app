#!/bin/bash

echo "🛑 Stopping Gradle daemons..."
cd android && ./gradlew --stop
cd ..

echo "🗑️  Wiping CMake caches..."
rm -rf android/app/.cxx
rm -rf android/build

echo "🗑️  Wiping Gradle transforms..."
rm -rf /Users/boniface/.gradle/caches/9.0.0/transforms

echo "🗑️  Wiping Gradle kotlin-dsl..."
rm -rf /Users/boniface/.gradle/caches/9.0.0/kotlin-dsl

echo "🧹 Running Gradle clean..."
cd android && ./gradlew clean
cd ..

echo "✅ Done! Now run: npm run android"
