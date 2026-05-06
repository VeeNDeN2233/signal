import java.io.FileInputStream
import java.util.Properties

plugins {
    id("com.android.application")
    id("com.google.devtools.ksp")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.example.personnelaccounting"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.personnelaccounting"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        
        
        val props = Properties()
        val localFile = rootProject.file("local.properties")
        if (localFile.exists()) {
            FileInputStream(localFile).use { props.load(it) }
        }
        val apiBaseUrl =
            props.getProperty("API_BASE_URL")?.trim()?.takeIf { it.isNotEmpty() }
                ?: (project.findProperty("API_BASE_URL") as String?)?.trim()?.takeIf { it.isNotEmpty() }
                ?: "http://10.0.2.2:3000/"
        require(apiBaseUrl.endsWith("/")) {
            "API_BASE_URL must end with /, e.g. http://192.168.1.5:3000/"
        }
        val escaped = apiBaseUrl.replace("\\", "\\\\").replace("\"", "\\\"")
        buildConfigField("String", "API_BASE_URL", "\"$escaped\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")

    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    
    implementation(platform("com.google.firebase:firebase-bom:34.11.0"))
    implementation("com.google.firebase:firebase-messaging")

    implementation("androidx.room:room-runtime:2.7.1")
    implementation("androidx.room:room-ktx:2.7.1")
    ksp("androidx.room:room-compiler:2.7.1")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
}
