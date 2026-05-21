document.addEventListener("DOMContentLoaded", function () {
    
    // ==========================================
    // 0. CONFIGURATION DE TON URL GOOGLE
    // ==========================================
    const GOOGLE_APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyMKAoZL8IH9MyyaSV1bz0HtDd4z6ZFfwqc0jABfBh0zHzIYx40sPInshGtKmufxiO4JA/exec"; 

    // ==========================================
    // 1. SYSTÈME DE VÉRIFICATION DES STATUTS (OUVERT/FERMÉ)
    // ==========================================
    // Si on est sur l'index, on enregistre l'état des recrutements
    if (document.getElementById('card-staff')) {
        const etatStaff = document.querySelector('#card-staff .badge').classList.contains('open') ? 'ouvert' : 'ferme';
        const etatHR = document.querySelector('#card-haut-rang .badge').classList.contains('open') ? 'ouvert' : 'ferme';
        const etatGestion = document.querySelector('#card-gestion .badge').classList.contains('open') ? 'ouvert' : 'ferme';
        
        localStorage.setItem('status_staff', etatStaff);
        localStorage.setItem('status_haut-rang', etatHR);
        localStorage.setItem('status_gestion', etatGestion);
    }

    // Fonction pour bloquer l'accès à un formulaire si fermé
    function verifierVerrouillageFormulaire(typeFormulaire, idFormulaire) {
        const formElement = document.getElementById(idFormulaire);
        if (!formElement) return;

        const statut = localStorage.getItem(`status_${typeFormulaire}`) || 'ouvert'; // Par défaut ouvert si pas passé par l'index
        
        if (statut === 'ferme') {
            // On crée un panneau d'alerte à la place du formulaire
            const alertDiv = document.createElement('div');
            alertDiv.className = "form-section";
            alertDiv.style.textAlign = "center";
            alertDiv.style.padding = "40px 20px";
            alertDiv.innerHTML = `
                <h2 style="color: #e74c3c; font-family: var(--font-title);">🔒 Recrutement Actuellement Fermé</h2>
                <p style="margin-top: 15px;">Désolé, les sessions de candidature pour cette catégorie sont closes pour le moment.</p>
                <p>Restez à l'affût des annonces officielles sur le Discord pour la prochaine vague !</p>
                <a href="index.html" class="btn" style="display:inline-block; margin-top:20px;">Retour à l'accueil</a>
            `;
            formElement.parentNode.insertBefore(alertDiv, formElement);
            formElement.style.display = "none"; // On cache le formulaire secret
        }
    }

    // Application des verrous selon la page courante
    verifierVerrouillageFormulaire('staff', 'staffForm');
    verifierVerrouillageFormulaire('haut-rang', 'hautRangForm');
    verifierVerrouillageFormulaire('gestion', 'gestionForm');


    // ==========================================
    // 2. SYSTÈME DE SAUVEGARDE AUTOMATIQUE (BROUILLONS)
    // ==========================================
    function gererBrouillonFormulaire(idFormulaire, stockageKey) {
        const form = document.getElementById(idFormulaire);
        if (!form) return;

        // Étape A : Recharger le brouillon existant au chargement de la page
        const brouillonSauvegarde = localStorage.getItem(stockageKey);
        if (brouillonSauvegarde) {
            try {
                const donnees = JSON.parse(brouillonSauvegarde);
                Object.keys(donnees).forEach(name => {
                    const champs = form.querySelectorAll(`[name="${name}"]`);
                    champs.forEach(champ => {
                        if (champ.type === 'checkbox' || champ.type === 'radio') {
                            if (Array.isArray(donnees[name])) {
                                champ.checked = donnees[name].includes(champ.value);
                            } else {
                                champ.checked = (champ.value === donnees[name]);
                            }
                            // Déclencher manuellement l'événement change pour forcer les blocs dynamiques à s'ouvrir !
                            champ.dispatchEvent(new Event('change'));
                        } else {
                            champ.value = donnees[name];
                            if(champ.tagName === 'SELECT') {
                                champ.dispatchEvent(new Event('change'));
                            }
                        }
                    });
                });
            } catch (e) { console.error("Erreur de chargement du brouillon", e); }
        }

        // Étape B : Écouter chaque frappe de clavier ou clic pour sauvegarder en temps réel
        form.addEventListener('input', sauvegarderDonnees);
        form.addEventListener('change', sauvegarderDonnees);

        function sauvegarderDonnees() {
            const formData = new FormData(form);
            const objetBrouillon = {};
            
            formData.forEach((value, key) => {
                // Gestion spécifique des cases à cocher multiples (comme les rôles staff)
                if (form.querySelectorAll(`[name="${key}"]`).length > 1 && !key.includes('accept')) {
                    if (!objetBrouillon[key]) objetBrouillon[key] = [];
                    objetBrouillon[key].push(value);
                } else {
                    objetBrouillon[key] = value;
                }
            });
            localStorage.setItem(stockageKey, JSON.stringify(objetBrouillon));
        }
    }

    // Initialisation des brouillons par page
    gererBrouillonFormulaire('staffForm', 'brouillon_staff');
    gererBrouillonFormulaire('hautRangForm', 'brouillon_haut_rang');
    gererBrouillonFormulaire('gestionForm', 'brouillon_gestion');


    // ==========================================
    // 3. LOGIQUE DYNAMIQUE DES ANCIENNES PAGES
    // ==========================================
    
    // Page Staff : Limite de cases cochées
    const checkboxes = document.querySelectorAll('input[name="roles"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            const checkedBoxes = document.querySelectorAll('input[name="roles"]:checked');
            if (checkedBoxes.length > 2) {
                this.checked = false;
                alert("Rappel : Vous ne pouvez postuler que pour 2 rôles de spécialité maximum.");
                return;
            }

            const sectionId = `section-${this.value}`;
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                if (this.checked) {
                    targetSection.style.display = 'block';
                    targetSection.querySelectorAll('textarea, select').forEach(field => field.required = true);
                } else {
                    targetSection.style.display = 'none';
                    targetSection.querySelectorAll('textarea, select').forEach(field => field.required = false);
                }
            }
        });
    });

    // Page Haut Rang : Liste déroulante
    const rangViseSelect = document.getElementById('rang_vise');
    if (rangViseSelect) {
        rangViseSelect.addEventListener('change', function () {
            document.querySelectorAll('.hr-specialized-section').forEach(section => {
                section.style.display = 'none';
                section.querySelectorAll('textarea').forEach(field => field.required = false);
            });
            const valeurNettoyee = this.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const sectionId = `section-${valeurNettoyee}`;
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.display = 'block';
                targetSection.querySelectorAll('textarea').forEach(field => field.required = true);
            }
        });
    }

    // Page Gestion : Liste déroulante
    const roleGestionSelect = document.getElementById('role_gestion_vise');
    if (roleGestionSelect) {
        roleGestionSelect.addEventListener('change', function () {
            document.querySelectorAll('.gest-specialized-section').forEach(section => {
                section.style.display = 'none';
                section.querySelectorAll('textarea, select').forEach(field => field.required = false);
            });
            const valeurNettoyee = this.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const sectionId = `section-${valeurNettoyee}`;
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.style.display = 'block';
                targetSection.querySelectorAll('textarea, select').forEach(field => field.required = true);
            }
        });
    }


    // ==========================================
    // 4. ÉCOUTEURS DE SOUMISSION ET ENVOIS
    // ==========================================
    
    // Soumission Staff
    const staffForm = document.getElementById('staffForm');
    if (staffForm) {
        const feedback = document.getElementById('formFeedback');
        const submitBtn = document.getElementById('submitBtn');
        staffForm.addEventListener('submit', function (e) {
            e.preventDefault();
            feedback.className = "feedback-message text-info";
            feedback.innerText = "Le Clan des Étoiles transmet votre message... Patientez...";
            submitBtn.disabled = true;

            const formData = new FormData(staffForm);
            const object = { formType: "staff" };
            const roles = [];
            formData.forEach((value, key) => {
                if (key === "roles") roles.push(value);
                else object[key] = value;
            });
            object["roles"] = roles;

            enoyerVersGoogleSheets(object, feedback, submitBtn, 'brouillon_staff');
        });
    }

    // Soumission Haut Rang
    const hrForm = document.getElementById('hautRangForm');
    if (hrForm) {
        const hrFeedback = document.getElementById('hrFormFeedback');
        const hrSubmitBtn = document.getElementById('hrSubmitBtn');
        hrForm.addEventListener('submit', function (e) {
            e.preventDefault();
            hrFeedback.className = "feedback-message text-info";
            hrFeedback.innerText = "Vos ancêtres étudient votre requête... Patientez...";
            hrSubmitBtn.disabled = true;

            const formData = new FormData(hrForm);
            const object = { formType: "haut-rang" };
            formData.forEach((value, key) => object[key] = value);

            enoyerVersGoogleSheets(object, hrFeedback, hrSubmitBtn, 'brouillon_haut_rang');
        });
    }

    // Soumission Gestion
    const gestionForm = document.getElementById('gestionForm');
    if (gestionForm) {
        const gestFeedback = document.getElementById('gestFormFeedback');
        const gestSubmitBtn = document.getElementById('gestSubmitBtn');
        gestionForm.addEventListener('submit', function (e) {
            e.preventDefault();
            gestFeedback.className = "feedback-message text-info";
            gestFeedback.innerText = "Le registre de gestion met à jour ses données... Patientez...";
            gestSubmitBtn.disabled = true;

            const formData = new FormData(gestionForm);
            const object = { formType: "gestion" };
            formData.forEach((value, key) => object[key] = value);

            enoyerVersGoogleSheets(object, gestFeedback, gestSubmitBtn, 'brouillon_gestion');
        });
    }

    // ==========================================
    // FONCTION COMMUNE D'ENVOI (FETCH)
    // ==========================================
    function enoyerVersGoogleSheets(donneesFormulaire, elementFeedback, boutonSubmit, cleBrouillonNettoyage) {
        if (GOOGLE_APP_SCRIPT_URL === "METS_TON_URL_SCRIPT_ICI" || GOOGLE_APP_SCRIPT_URL === "") {
            elementFeedback.className = "feedback-message text-error";
            elementFeedback.innerText = "Erreur configuration : L'URL Google Apps Script est manquante.";
            boutonSubmit.disabled = false;
            return;
        }

        fetch(GOOGLE_APP_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            cache: "no-cache",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(donneesFormulaire)
        })
        .then(() => {
            elementFeedback.className = "feedback-message text-success";
            elementFeedback.innerText = "✨ Candidature envoyée avec succès ! Merci de votre investissement.";
            
            // Suppression du brouillon puisque l'envoi a réussi !
            localStorage.removeItem(cleBrouillonNettoyage);

            const formForm = elementFeedback.closest('form');
            if(formForm) formForm.reset();
            
            document.querySelectorAll('.hr-specialized-section, .gest-specialized-section, .specialized-section').forEach(s => s.style.display = 'none');
            boutonSubmit.disabled = false;
        })
        .catch(error => {
            console.error("Erreur d'envoi :", error);
            elementFeedback.className = "feedback-message text-error";
            elementFeedback.innerText = "❌ Une erreur est survenue lors de l'envoi. Veuillez réessayer.";
            boutonSubmit.disabled = false;
        });
    }
});