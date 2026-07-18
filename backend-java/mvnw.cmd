@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with  the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script
@REM
@REM Required ENV vars:
@REM JAVA_HOME - Location of a JDK home dir
@REM
@REM Optional ENV vars
@REM MAVEN_BATCH_ECHO - set to 'on' to enable the echoing of the batch commands
@REM MAVEN_BATCH_PAUSE - set to 'on' to wait for a key stroke before ending
@REM MAVEN_OPTS - parameters passed to the Java VM when running Maven
@REM     e.g. to debug Maven itself, use
@REM     set MAVEN_OPTS=-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=8000
@REM ----------------------------------------------------------------------------

@REM Begin all REM lines with '@' in case MAVEN_BATCH_ECHO is 'on'
@echo off
@REM set title of command prompt window
title %0
@REM enable echoing by setting MAVEN_BATCH_ECHO to 'on'
@if "%MAVEN_BATCH_ECHO%" == "on"  echo %MAVEN_BATCH_ECHO%

@REM set %HOME% to equivalent of $HOME
if "%HOME%" == "" (set "HOME=%USERPROFILE%")

@REM Only local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@REM Resolve any "." and ".." in APP_HOME to make it shorter.
for %%i in ("%APP_HOME%") do set APP_HOME=%%~fi
if "%APP_HOME:~-1%"=="\" set "APP_HOME=%APP_HOME:~0,-1%"

@REM Validate JAVA_HOME
if not "%JAVA_HOME%" == "" goto OkJHome

echo.
echo Error: JAVA_HOME not found in your environment. >&2
echo Please set the JAVA_HOME variable in your environment to match the >&2
echo location of your Java installation. >&2
echo.
goto error

:OkJHome
if exist "%JAVA_HOME%\bin\java.exe" goto chkMHome

echo.
echo Error: JAVA_HOME is set to an invalid directory. >&2
echo JAVA_HOME = "%JAVA_HOME%" >&2
echo Please set the JAVA_HOME variable in your environment to match the >&2
echo location of your Java installation. >&2
echo.
goto error

:chkMHome
set WRAPPER_JAR="%APP_HOME%\.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_PROPERTIES="%APP_HOME%\.mvn\wrapper\maven-wrapper.properties"
set WRAPPER_JAR_TEMP="%APP_HOME%\.mvn\wrapper\maven-wrapper.jar.tmp"

if exist %WRAPPER_JAR% goto run

echo Downloading maven-wrapper.jar...
@REM Downloading with PowerShell
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar', '%WRAPPER_JAR_TEMP%')"
if %ERRORLEVEL% neq 0 (
  echo Error: Failed to download maven-wrapper.jar >&2
  goto error
)

move /y %WRAPPER_JAR_TEMP% %WRAPPER_JAR% >nul

:run
set MAVEN_CMD_LINE_ARGS=%*

"%JAVA_HOME%\bin\java.exe" %MAVEN_OPTS% -classpath %WRAPPER_JAR% "-Dmaven.multiModuleProjectDirectory=%APP_HOME%" org.apache.maven.wrapper.MavenWrapperMain %MAVEN_CMD_LINE_ARGS%
if %ERRORLEVEL% neq 0 goto error
goto end

:error
exit /b 1

:end
if "%OS%"=="Windows_NT" endlocal
