def slackNotificationMethod(String buildStatus = 'STARTED') {
    buildStatus = buildStatus ?: 'SUCCESS'

    def color

    if (buildStatus == 'SUCCESS') {
    color = '#47ec05'
    } else if (buildStatus == 'UNSTABLE') {
    color = '#d5ee0d'
    } else {
    color = '#ec2805'
    }

    def msg = "${buildStatus}: `${env.JOB_NAME}` #${env.BUILD_NUMBER}:\n${env.BUILD_URL}"

    slackSend(color: color, message: msg)
}


pipeline {
    agent any

    tools {
        nodejs 'nodejs-22-6-0'
    }

    environment {
        MONGO_URI = credentials('mongo-db-uri')
        MONGO_USERNAME = credentials('mongo-db-username')
        MONGO_PASSWORD = credentials('mongo-db-password')
        SONAR_SCANNER_HOME = tool 'SonarQube-Scanner-620'
        GITEA_TOKEN = credentials('gitea-api-token')
        GITEA_URL = '34.122.218.25:3000'
        CLUSTER_ADDRESS = 'https://5587d40b0dafbc9207ed36d7cd43271b.serveo.net'
        HARBOR_DOMAIN = 'ayazumman.xyz'
        IMAGE = "${env.HARBOR_DOMAIN}/jenkins/solar-system"
        TAG = "${env.GIT_COMMIT ?: 'build-' + new Date().format('yyyyMMddHHmmss')}"
    }

    options {
        disableConcurrentBuilds abortPrevious: true
    }

    stages {
        stage('Create .env file') {
            steps {
                script {
                    sh '''
                        echo "MONGO_URI=$MONGO_URI" > .env
                        echo "MONGO_USERNAME=$MONGO_USERNAME" >> .env
                        echo "MONGO_PASSWORD=$MONGO_PASSWORD" >> .env
                    '''
                }
            }
        }

        stage('Installing Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Dependency Scanning') {
            parallel {
                stage('NPM Dependency Audit') {
                    steps {
                        sh 'npm audit fix'
                        sh 'npm audit --audit-level=critical'
                    }
                }

                stage('OWASP Dependency Check') {
                    steps {
                        sh 'mkdir -p ./reports/owasp'

                        dependencyCheck additionalArguments: '''
                            --scan \'./\' 
                            --out \'./reports/owasp/\'  
                            --format \'ALL\' 
                            --disableYarnAudit \
                            --prettyPrint''', odcInstallation: 'OWASP-DepCheck-11'

                        dependencyCheckPublisher failedTotalCritical: 1, pattern: '**/reports/owasp/dependency-check-report.xml', stopBuild: true
                    }
                }
            }
        }

        stage('Unit Testing') {
            steps {
                   sh 'npm test'
            }
        }    

        stage('Code Coverage') {
            steps {
                catchError(buildResult: 'SUCCESS', message: 'Oops! It will be fixed in the future releases', stageResult: 'UNSTABLE') {
                    sh 'npm run coverage'
                }
            }
        }

        stage('SAST - SonarQube') {
            steps {
                timeout(time: 120, unit: 'SECONDS') {
                    withSonarQubeEnv('sonar-qube-server') {
                        sh 'echo $SONAR_SCANNER_HOME'
                        sh '''
                            $SONAR_SCANNER_HOME/bin/sonar-scanner \
                                -Dsonar.projectKey=Solar-System-Project \
                                -Dsonar.sources=app.js \
                                -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info
                        '''
                    }
                    waitForQualityGate abortPipeline: true
                }
            }
        } 

        stage('Build Docker Image') {
            steps {
                sh "sudo docker build -t ${env.IMAGE}:${env.TAG} ."
            }
        }

        stage('Trivy Vulnerability Scanner') {
            steps {
                sh  """
                    sudo trivy image ${env.IMAGE}:${env.TAG} \
                        --severity LOW,MEDIUM,HIGH \
                        --exit-code 0 \
                        --quiet \
                        --format json -o trivy-image-LMH-results.json

                    sudo trivy image ${env.IMAGE}:${env.TAG} \
                        --severity CRITICAL \
                        --exit-code 1 \
                        --quiet \
                        --format json -o trivy-image-CRITICAL-results.json
                """
            }
            post {
                always {
                    sh '''
                        sudo trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            --output trivy-image-LMH-results.html trivy-image-LMH-results.json 

                        sudo trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            --output trivy-image-CRITICAL-results.html trivy-image-CRITICAL-results.json

                        sudo trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            --output trivy-image-LMH-results.xml  trivy-image-LMH-results.json 

                        sudo trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            --output trivy-image-CRITICAL-results.xml trivy-image-CRITICAL-results.json          
                    '''
                }
            }
        } 

        stage("Login to Harbor") {
            steps {
                withCredentials([usernamePassword(credentialsId: 'harbor-credentials',
                                                 usernameVariable: 'HARBOR_USERNAME',
                                                 passwordVariable: 'HARBOR_PASSWORD')]) {
                    sh "echo ${env.HARBOR_PASSWORD} | docker login -u ${env.HARBOR_USERNAME} --password-stdin ${env.HARBOR_DOMAIN}"
                }
            }
        }

        stage("Push to Harbor") {
            steps {
                sh "sudo docker push ${env.IMAGE}:${env.TAG}"
            }
        }

        stage('Deploy - GCP Compute Engine') {
            when {
                branch 'feature/*'
            }
            steps {
                script {
                    sshagent(['gcp-deploy-instance']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ayazumman@34.171.240.22 << EOF
                                if sudo docker ps -a | grep -q 'solar-system'; then
                                    echo "Stopping and removing existing container 'solar-system'..."
                                    sudo docker stop solar-system && sudo docker rm solar-system
                                fi
                                echo "Starting new container..."
                                sudo docker run --name solar-system --rm \
                                    -e MONGO_URI=$MONGO_URI \
                                    -e MONGO_USERNAME=$MONGO_USERNAME \
                                    -e MONGO_PASSWORD=$MONGO_PASSWORD \
                                    -p 5555:5555 \
                                    -d $IMAGE:$TAG
EOF
                        """
                    }
                }
            }    
        }

        stage('Integration Testing - GCP Compute Engine') {
            when {
                branch 'feature/*'
            }
            steps {
                withCredentials([file(credentialsId: 'gcp-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh """
                        gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
                        bash integration-testing.sh
                    """
                }
            }
        }

        stage('K8S - Update Image Tag') {
            when {
                branch 'PR*'
            }
            steps {
                sh "git clone -b main http://$GITEA_URL/Jenkins/solar-system-gitops-argocd"
                dir("solar-system-gitops-argocd/kubernetes") {
                    sh """
                        git switch main
                        git checkout -b feature-$BUILD_ID
                        sed -i "s#${IMAGE}.*#$IMAGE:$GIT_COMMIT#g" deployment.yml
                        
                        git config --global user.email "ummanmemmedov2005@gmail.com"
                        git config --global user.name "UMMAN2005"
                        git remote set-url origin http://$GITEA_TOKEN@$GITEA_URL/Jenkins/solar-system-gitops-argocd
                        git add .
                        git commit -am "Updated docker image in deployment manifest"
                        git fetch origin main
                        git rebase origin/main
                        git push -u origin feature-$BUILD_ID --force
                    """
                }
            }
        }

        stage('K8S - Raise PR') {
            when {
                branch 'PR*'
            }
            steps {
                sh """
                    curl -X 'POST' \
                        'http://$GITEA_URL/api/v1/repos/Jenkins/solar-system-gitops-argocd/pulls' \
                        -H 'accept: application/json' \
                        -H 'Authorization: token $GITEA_TOKEN' \
                        -H 'Content-Type: application/json' \
                        -d '{
                            "assignee": "UMMAN2005",
                                "assignees": [
                                    "UMMAN2005"
                                ],
                            "base": "main",
                            "body": "Updated docker image in deployment manifest",
                            "head": "feature-$BUILD_ID",
                            "title": "Updated Docker Image"
                        }'
                """
            }
        }
/*
        stage('App Deployed?') {
            when {
                branch 'PR*'
            }
            steps {
                timeout(time: 1, unit: 'DAYS') {
                    input message: 'Is the PR Merged and ArgoCD Synced?', ok: 'YES! Let us continue with DAST', submitter: 'admin'
                }
            }
        }

        stage('DAST - OWASP ZAP') {
            when {
                branch 'PR*'
            }
            steps {
                sh '''
                    chmod 777 $(pwd)
                    sudo docker run -v $(pwd):/zap/wrk/:rw  ghcr.io/zaproxy/zaproxy zap-api-scan.py \
                    -t $CLUSTER_ADDRESS/api-docs/ \
                    -f openapi \
                    -r zap_report.html \
                    -w zap_report.md \
                    -J zap_json_report.json \
                    -x zap_xml_report.xml \
                    -c zap_ignore_rules
                '''
            }
        }
*/
        stage('Upload - GCP Storage') {
            when {
                branch 'PR*'
            }
            steps {
                withCredentials([file(credentialsId: 'gcp-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh  '''
                        mkdir reports-$BUILD_ID
                        cp -rf coverage/ reports-$BUILD_ID/
                        cp dependency*.* test-results.xml trivy*.* zap*.* reports-$BUILD_ID/
                    '''
                    sh '''
                        gsutil -m cp -r reports-$BUILD_ID gs://solar-system-jenkins-reports-bucket/jenkins-$BUILD_ID/
                    '''
                }
            }
        } 

        stage('Deploy to Prod?') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 1, unit: 'DAYS') {
                    input message: 'Deploy to Production?', ok: 'YES! Let us try this on Production', submitter: 'admin'
                }
            }
        }

        stage('Cloud Function - GCS Upload & Deploy') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([file(credentialsId: 'gcp-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh '''
                        gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
                    '''
                    sh '''
                        # Modify app.js as required
                        tail -5 app.js
                        echo "******************************************************************"
                        sed -i "/^app\\.listen(port/ s/^/\\/\\//" app.js
                        sed -i "s/^module.exports = app;/\\/\\/module.exports = app;/g" app.js
                        sed -i "s|^//module.exports.handler|module.exports.handler|" app.js
                        echo "******************************************************************"
                        tail -5 app.js
                    '''
                    sh '''
                        # Create a ZIP file of the function
                        zip -qr solar-system-lambda-$BUILD_ID.zip app* package* index.html node*
                        ls -ltr solar-system-lambda-$BUILD_ID.zip
                    '''
                    sh '''
                        # Upload the ZIP file to the GCS bucket
                        gsutil cp solar-system-lambda-$BUILD_ID.zip gs://solar-system-lambda-bucket/
                    '''
                    sh """
                        # Deploy the function to GCP and set environment variables
                        gcloud functions deploy solar-system-function \
                            --runtime nodejs18 \
                            --trigger-http \
                            --entry-point handler \
                            --source gs://solar-system-lambda-bucket/solar-system-lambda-${BUILD_ID}.zip \
                            --set-env-vars MONGO_USERNAME=${MONGO_USERNAME},MONGO_PASSWORD=${MONGO_PASSWORD},MONGO_URI=${MONGO_URI}
                    """
                }
            }
        }

        stage('Cloud Function - Invoke Function') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([file(credentialsId: 'gcp-service-account-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh '''
                        # Wait for 30 seconds to ensure function is deployed and ready
                        sleep 30s

                        # Get the function URL
                        function_url_data=$(gcloud functions describe solar-system-function --format="value(httpsTrigger.url)")

                        # Use curl to invoke the function and check for a 200 OK response
                        curl -Is $function_url_data/live | grep -i "200 OK"
                    '''
                }
            }
        }
    }

    post {
        always {
            // slackNotificationMethod("${currentBuild.result}")

            script {
                if (fileExists('solar-system-gitops-argocd')) {
                    sh 'rm -rf solar-system-gitops-argocd'
                }
            }
/*
            junit allowEmptyResults: true, stdioRetention: '', testResults: 'test-results.xml'
            junit allowEmptyResults: true, stdioRetention: '', testResults: 'dependency-check-junit.xml' 
            junit allowEmptyResults: true, stdioRetention: '', testResults: 'trivy-image-CRITICAL-results.xml'
            junit allowEmptyResults: true, stdioRetention: '', testResults: 'trivy-image-MEDIUM-results.xml'

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'zap_report.html', reportName: 'DAST - OWASP ZAP Report', reportTitles: '', useWrapperFileDirectly: true])

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'trivy-image-CRITICAL-results.html', reportName: 'Trivy Image Critical Vul Report', reportTitles: '', useWrapperFileDirectly: true])

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'trivy-image-MEDIUM-results.html', reportName: 'Trivy Image Medium Vul Report', reportTitles: '', useWrapperFileDirectly: true])

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'dependency-check-jenkins.html', reportName: 'Dependency Check HTML Report', reportTitles: '', useWrapperFileDirectly: true])

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Code Coverage HTML Report', reportTitles: '', useWrapperFileDirectly: true])
*/
        }
    }
}
